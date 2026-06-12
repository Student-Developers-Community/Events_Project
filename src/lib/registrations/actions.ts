"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { registerAttendeeSchema } from "./schemas";
import { enqueue } from "@/lib/notifications/dispatch";
import type { EventQuestion } from "@/lib/db/types";

export type ActionResult =
  | { ok: true; qr_token: string; free: boolean }
  | { ok: false; error: string };

type StoredAnswer = { id: string; label: string; type: string; value: string };

/**
 * Queue the confirmation email + (future-dated) 24h / 1h reminder emails for a
 * confirmed registration. Shared by the free-ticket fast-path and the
 * confirm-without-payment flow.
 */
async function scheduleConfirmationEmails(args: {
  registrationId: string;
  eventId: string;
  attendeeEmail: string;
  startsAt: string | null;
  qrToken: string;
}): Promise<void> {
  await enqueue({
    registration_id: args.registrationId,
    event_id:        args.eventId,
    channel:         "email",
    template:        "registration_confirmed",
    recipient:       args.attendeeEmail,
    payload:         { qr_token: args.qrToken },
  });

  const startMs = args.startsAt ? new Date(args.startsAt).getTime() : 0;
  const now = Date.now();
  const reminders: Array<{ window: "24h" | "1h"; at: number }> = [
    { window: "24h", at: startMs - 24 * 60 * 60 * 1000 },
    { window: "1h",  at: startMs - 60 * 60 * 1000 },
  ];
  for (const r of reminders) {
    if (r.at > now) {
      await enqueue(
        {
          registration_id: args.registrationId,
          event_id:        args.eventId,
          channel:         "email",
          template:        "event_reminder",
          recipient:       args.attendeeEmail,
          payload:         { window: r.window },
        },
        { scheduledFor: new Date(r.at).toISOString() },
      );
    }
  }
}

/**
 * Create a 'pending' registration — email-based, no login required.
 * If the visitor happens to be logged in we link their user_id so it shows
 * up on their dashboard, but login is NOT required to register.
 */
export async function registerAttendeeAction(
  _: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = registerAttendeeSchema.safeParse({
    event_id:       formData.get("event_id"),
    tier_id:        formData.get("tier_id"),
    attendee_name:  formData.get("attendee_name"),
    attendee_email: formData.get("attendee_email"),
    attendee_phone: formData.get("attendee_phone"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const sb = await getSupabaseServerClient();
  if (!sb) return { ok: false, error: "Supabase is not configured" };

  // Optional — link to the user if they happen to be signed in. Not required.
  const { data: { user } } = await sb.auth.getUser();

  // Validate tier is still available
  const { data: tier, error: tierErr } = await sb
    .from("v_tiers_public")
    .select("id, event_id, price_paise, is_sold_out")
    .eq("id", v.tier_id)
    .maybeSingle();
  if (tierErr || !tier) return { ok: false, error: "This tier is no longer available." };
  if (tier.event_id !== v.event_id) return { ok: false, error: "Tier doesn't belong to this event." };
  if (tier.is_sold_out) return { ok: false, error: "This tier is sold out." };

  // Fetch the event's custom questions (authoritative — never trust the client)
  // plus starts_at for reminder scheduling.
  const { data: ev } = await sb
    .from("v_events_public")
    .select("questions, starts_at, ends_at")
    .eq("id", v.event_id)
    .maybeSingle();

  // Registration closes once the event has ended.
  if (ev?.ends_at && new Date(ev.ends_at).getTime() < Date.now()) {
    return { ok: false, error: "Registration is closed — this event has already taken place." };
  }

  const questions: EventQuestion[] = Array.isArray(ev?.questions) ? ev!.questions : [];

  // Collect + validate answers to the organiser's questions.
  const answers: StoredAnswer[] = [];
  for (const q of questions) {
    const raw = formData.get(`q_${q.id}`);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (q.required && value === "") {
      return { ok: false, error: `Please answer: ${q.label}` };
    }
    if (value !== "") {
      answers.push({ id: q.id, label: q.label, type: q.type, value: value.slice(0, 2000) });
    }
  }

  const isFree = tier.price_paise === 0;

  // Guest registration (no login) → insert via service-role. We've already
  // validated the tier/event above, so this is a trusted server-side write.
  // The regular RLS client can't insert+return for an anon user.
  const svc = getSupabaseServiceClient();
  if (!svc) return { ok: false, error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." };

  const nowIso = new Date().toISOString();
  const { data, error } = await svc
    .from("registrations")
    .insert({
      event_id:       v.event_id,
      tier_id:        v.tier_id,
      user_id:        user?.id ?? null,
      attendee_name:  v.attendee_name,
      attendee_email: v.attendee_email,
      attendee_phone: v.attendee_phone,
      // Free tickets need no payment → confirm immediately. Paid → pending.
      status:         isFree ? "confirmed" : "pending",
      confirmed_at:   isFree ? nowIso : null,
      amount_paise:   tier.price_paise,
      metadata:       answers.length > 0 ? { answers } : {},
    })
    .select("id, qr_token")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "You're already registered for this event with that email." };
    }
    return { ok: false, error: error.message };
  }

  // For free tickets, fire the confirmation email + reminders right away.
  if (isFree) {
    await scheduleConfirmationEmails({
      registrationId: data.id,
      eventId:        v.event_id,
      attendeeEmail:  v.attendee_email,
      startsAt:       ev?.starts_at ?? null,
      qrToken:        data.qr_token,
    });
  }

  revalidatePath(`/events`);
  return { ok: true, qr_token: data.qr_token, free: isFree };
}

/**
 * DEV SHORTCUT — confirm a registration without payment, by qr_token.
 * Uses service_role to bypass RLS. Future: Razorpay webhook replaces this.
 */
export async function confirmWithoutPaymentAction(formData: FormData): Promise<void> {
  const qrToken = String(formData.get("qr_token") ?? "");
  const eventSlug = String(formData.get("event_slug") ?? "");
  if (!qrToken || !eventSlug) return;

  const svc = getSupabaseServiceClient();
  if (!svc) {
    console.error("[confirmWithoutPaymentAction] missing SUPABASE_SERVICE_ROLE_KEY");
    return;
  }

  const { data: reg, error } = await svc
    .from("registrations")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("qr_token", qrToken)
    .eq("status", "pending")
    .select("id, event_id, attendee_email, attendee_name, events ( starts_at )")
    .maybeSingle();

  if (error || !reg) {
    console.error("[confirmWithoutPaymentAction]", error?.message);
    redirect(`/events/${eventSlug}/register/success?qr=${encodeURIComponent(qrToken)}&err=1`);
  }

  // Confirmation email (delivered immediately, with .ics attached) + reminders.
  const ev = Array.isArray(reg.events) ? reg.events[0] : reg.events;
  await scheduleConfirmationEmails({
    registrationId: reg.id,
    eventId:        reg.event_id,
    attendeeEmail:  reg.attendee_email,
    startsAt:       ev?.starts_at ?? null,
    qrToken:        qrToken,
  });

  revalidatePath(`/events/${eventSlug}`);
  redirect(`/events/${eventSlug}/register/success?qr=${encodeURIComponent(qrToken)}`);
}
