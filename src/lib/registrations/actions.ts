"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { registerAttendeeSchema } from "./schemas";
import { enqueue } from "@/lib/notifications/dispatch";

export type ActionResult = { ok: true; qr_token: string } | { ok: false; error: string };

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

  // Guest registration (no login) → insert via service-role. We've already
  // validated the tier/event above, so this is a trusted server-side write.
  // The regular RLS client can't insert+return for an anon user.
  const svc = getSupabaseServiceClient();
  if (!svc) return { ok: false, error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." };

  const { data, error } = await svc
    .from("registrations")
    .insert({
      event_id:       v.event_id,
      tier_id:        v.tier_id,
      user_id:        user?.id ?? null,
      attendee_name:  v.attendee_name,
      attendee_email: v.attendee_email,
      attendee_phone: v.attendee_phone,
      status:         "pending",
      amount_paise:   tier.price_paise,
    })
    .select("id, qr_token")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "You're already registered for this event with that email." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/events`);
  return { ok: true, qr_token: data.qr_token };
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

  // 1. Confirmation email (delivered immediately, with .ics attached)
  await enqueue({
    registration_id: reg.id,
    event_id:        reg.event_id,
    channel:         "email",
    template:        "registration_confirmed",
    recipient:       reg.attendee_email,
    payload:         { qr_token: qrToken },
  });

  // 2. Schedule reminders — only if their fire time is still in the future
  const ev = Array.isArray(reg.events) ? reg.events[0] : reg.events;
  const startMs = ev?.starts_at ? new Date(ev.starts_at).getTime() : 0;
  const now = Date.now();
  const reminders: Array<{ window: "24h" | "1h"; at: number }> = [
    { window: "24h", at: startMs - 24 * 60 * 60 * 1000 },
    { window: "1h",  at: startMs - 60 * 60 * 1000 },
  ];
  for (const r of reminders) {
    if (r.at > now) {
      await enqueue(
        {
          registration_id: reg.id,
          event_id:        reg.event_id,
          channel:         "email",
          template:        "event_reminder",
          recipient:       reg.attendee_email,
          payload:         { window: r.window },
        },
        { scheduledFor: new Date(r.at).toISOString() },
      );
    }
  }

  revalidatePath(`/events/${eventSlug}`);
  redirect(`/events/${eventSlug}/register/success?qr=${encodeURIComponent(qrToken)}`);
}
