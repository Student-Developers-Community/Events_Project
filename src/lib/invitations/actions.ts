"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/notifications/email-sender";
import { renderGuestInvitation } from "@/lib/notifications/templates/guest-invitation";
import { enqueue } from "@/lib/notifications/dispatch";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const emailSchema = z.string().trim().toLowerCase().email();

export type InviteResult =
  | { ok: true; invited: number; skipped: number; failed: number }
  | { ok: false; error: string };

/** Organiser invites guests by email. Inserts invitations + emails each one. */
export async function inviteGuestsAction(
  _: InviteResult | undefined,
  formData: FormData,
): Promise<InviteResult> {
  const eventId = String(formData.get("event_id") ?? "");
  if (!eventId) return { ok: false, error: "Missing event id" };

  const raw = String(formData.get("emails") ?? "");
  const candidates = Array.from(new Set(
    raw.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean),
  ));
  if (candidates.length === 0) return { ok: false, error: "Enter at least one email address." };
  if (candidates.length > 100) return { ok: false, error: "Up to 100 invites at a time." };

  const valid = candidates.filter((e) => emailSchema.safeParse(e).success);
  if (valid.length === 0) return { ok: false, error: "No valid email addresses found." };

  const sb = await getSupabaseServerClient();
  if (!sb) return { ok: false, error: "Supabase is not configured" };
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Verify ownership + load event details for the email.
  const { data: ev } = await sb
    .from("events")
    .select("id, title, subtitle, starts_at, timezone, is_online, venue_name, city")
    .eq("id", eventId).eq("organiser_id", user.id).maybeSingle();
  if (!ev) return { ok: false, error: "Event not found" };

  const { data: org } = await sb.from("organisers").select("display_name").eq("id", user.id).maybeSingle();
  const organiserName = org?.display_name ?? "The organiser";

  // Skip emails already invited.
  const { data: existing } = await sb
    .from("event_invitations").select("email").eq("event_id", eventId);
  const already = new Set((existing ?? []).map((r) => r.email.toLowerCase()));
  const fresh = valid.filter((e) => !already.has(e));
  const skipped = valid.length - fresh.length;

  if (fresh.length === 0) return { ok: true, invited: 0, skipped, failed: 0 };

  const { data: inserted, error } = await sb
    .from("event_invitations")
    .insert(fresh.map((email) => ({ event_id: eventId, email, invited_by: user.id })))
    .select("email, token, name");
  if (error) return { ok: false, error: error.message };

  // Email each new invite (best-effort; dryruns if SMTP not configured).
  let failed = 0;
  for (const inv of inserted ?? []) {
    const { subject, html, text } = renderGuestInvitation({
      guest_name: inv.name ?? null,
      event_title: ev.title,
      event_subtitle: ev.subtitle,
      event_starts_at: ev.starts_at,
      event_timezone: ev.timezone,
      event_is_online: ev.is_online,
      event_venue_name: ev.venue_name,
      event_city: ev.city,
      organiser_name: organiserName,
      invite_url: `${APP_URL}/invite/${inv.token}`,
    });
    const res = await sendEmail({ to: inv.email, subject, html, text });
    if (!res.ok && !res.dryrun) failed++;
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true, invited: inserted?.length ?? 0, skipped, failed };
}

/** Guest accepts or declines via the invite link. Accept → comp ticket + QR. */
export async function respondToInvitationAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const response = String(formData.get("response") ?? "");
  if (!token) return;

  const svc = getSupabaseServiceClient();
  if (!svc) redirect(`/invite/${token}?err=1`);

  const { data: inv } = await svc
    .from("event_invitations")
    .select("id, event_id, email, name, status, registration_id")
    .eq("token", token).maybeSingle();
  if (!inv) redirect("/");

  // Already responded → bounce back to the invite page (it shows the state).
  if (inv.status !== "invited") redirect(`/invite/${token}`);

  if (response === "decline") {
    await svc.from("event_invitations")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", inv.id);
    redirect(`/invite/${token}`);
  }

  // Accept → create a complimentary confirmed registration so they get a QR.
  const { data: ev } = await svc.from("events").select("slug").eq("id", inv.event_id).maybeSingle();
  const slug = ev?.slug;

  const { data: tier } = await svc.from("ticket_tiers")
    .select("id").eq("event_id", inv.event_id).is("deleted_at", null).eq("is_active", true)
    .order("sort_order", { ascending: true }).limit(1).maybeSingle();

  let registrationId = inv.registration_id as string | null;
  let qrToken: string | null = null;

  if (tier) {
    const nowIso = new Date().toISOString();
    const { data: reg, error } = await svc.from("registrations").insert({
      event_id: inv.event_id,
      tier_id: tier.id,
      attendee_name: inv.name || inv.email.split("@")[0],
      attendee_email: inv.email,
      status: "confirmed",
      confirmed_at: nowIso,
      amount_paise: 0,
      metadata: { source: "invitation", invitation_id: inv.id },
    }).select("id, qr_token").single();

    if (!error && reg) {
      registrationId = reg.id;
      qrToken = reg.qr_token;
    } else if (error?.code === "23505") {
      // Already has an active registration for this event/email — reuse it.
      const { data: existing } = await svc.from("registrations")
        .select("id, qr_token")
        .eq("event_id", inv.event_id).ilike("attendee_email", inv.email)
        .in("status", ["pending", "confirmed", "checked_in"]).is("deleted_at", null)
        .maybeSingle();
      registrationId = existing?.id ?? null;
      qrToken = existing?.qr_token ?? null;
    }
  }

  await svc.from("event_invitations").update({
    status: "accepted",
    responded_at: new Date().toISOString(),
    registration_id: registrationId,
  }).eq("id", inv.id);

  // Email them the confirmation + QR (best-effort, via the outbox).
  if (registrationId) {
    await enqueue({
      registration_id: registrationId,
      event_id: inv.event_id,
      channel: "email",
      template: "registration_confirmed",
      recipient: inv.email,
      payload: { qr_token: qrToken },
    });
  }

  if (slug) revalidatePath(`/dashboard/events/${inv.event_id}`);
  // Show their ticket+QR on the existing success page, else back to the invite.
  if (slug && qrToken) {
    redirect(`/events/${slug}/register/success?qr=${encodeURIComponent(qrToken)}`);
  }
  redirect(`/invite/${token}`);
}
