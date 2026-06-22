"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { registerAttendeeSchema, registerTeamSchema, type TeamMemberInput } from "./schemas";
import { enqueue } from "@/lib/notifications/dispatch";
import type { EventQuestion } from "@/lib/db/types";

export type TeamResult =
  | { ok: true; qr_token: string; slug: string }
  | { ok: false; error: string };

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

/**
 * Hackathon team registration. The team lead signs up the whole team:
 * validates eligibility + per-college team quota, creates the team and one
 * confirmed registration (with QR) per member.
 */
export async function registerTeamAction(
  _: TeamResult | undefined,
  formData: FormData,
): Promise<TeamResult> {
  // members come as a JSON string from the form
  let members: TeamMemberInput[] = [];
  try {
    const raw = JSON.parse(String(formData.get("members") ?? "[]"));
    if (Array.isArray(raw)) members = raw;
  } catch { /* ignore */ }

  const parsed = registerTeamSchema.safeParse({
    event_id:   formData.get("event_id"),
    team_name:  formData.get("team_name"),
    college:    formData.get("college") ?? "",
    lead_phone: formData.get("lead_phone"),
    members,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;

  const svc = getSupabaseServiceClient();
  if (!svc) return { ok: false, error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." };

  // Load + gate the event.
  const { data: ev } = await svc
    .from("events")
    .select("slug, status, visibility, approval_status, deleted_at, ends_at, is_hackathon, team_size, eligibility_mode, entry_fee_paise, allow_others, others_quota")
    .eq("id", v.event_id).maybeSingle();
  if (!ev || ev.deleted_at || ev.status !== "published" || ev.visibility !== "public" || ev.approval_status !== "approved") {
    return { ok: false, error: "This event isn't open for registration." };
  }
  if (!ev.is_hackathon) return { ok: false, error: "This event isn't a team hackathon." };
  if (ev.ends_at && new Date(ev.ends_at).getTime() < Date.now()) {
    return { ok: false, error: "Registration is closed — this event has ended." };
  }

  // Exact team size.
  if (ev.team_size && v.members.length !== ev.team_size) {
    return { ok: false, error: `Teams must have exactly ${ev.team_size} members.` };
  }

  // Unique emails within the team.
  const emails = v.members.map((m) => m.email.toLowerCase());
  if (new Set(emails).size !== emails.length) {
    return { ok: false, error: "Each member needs a unique email." };
  }

  // College eligibility + per-college TEAM quota (with optional "Others" bucket).
  const college = (v.college ?? "").trim();
  if (ev.eligibility_mode === "colleges") {
    if (!college) return { ok: false, error: "Please select your college." };
    const { data: allowed } = await svc
      .from("event_colleges").select("name, team_quota").eq("event_id", v.event_id);
    const { data: existingTeams } = await svc
      .from("event_teams").select("college").eq("event_id", v.event_id);
    const teamsList = existingTeams ?? [];
    const match = (allowed ?? []).find((c) => c.name.toLowerCase() === college.toLowerCase());

    if (match) {
      const used = teamsList.filter((t) => (t.college ?? "").toLowerCase() === college.toLowerCase()).length;
      if (used >= match.team_quota) return { ok: false, error: `Registrations are full for ${match.name}.` };
    } else if (ev.allow_others) {
      // "Others" bucket — any college not in the list, counted together.
      const allowedSet = new Set((allowed ?? []).map((c) => c.name.toLowerCase()));
      const othersUsed = teamsList.filter((t) => t.college && !allowedSet.has(t.college.toLowerCase())).length;
      if (ev.others_quota != null && othersUsed >= ev.others_quota) {
        return { ok: false, error: "Registrations are full for the “Others” category." };
      }
    } else {
      return { ok: false, error: "Your college isn't in the allowed list for this event." };
    }
  }

  // No member already registered for this event (active).
  const { data: existing } = await svc
    .from("registrations").select("attendee_email")
    .eq("event_id", v.event_id).is("deleted_at", null)
    .in("status", ["pending", "confirmed", "checked_in"]);
  const taken = new Set((existing ?? []).map((r) => r.attendee_email.toLowerCase()));
  const clash = emails.find((e) => taken.has(e));
  if (clash) return { ok: false, error: `${clash} is already registered for this event.` };

  // Create the team.
  const lead = v.members[0];
  const { data: team, error: teamErr } = await svc
    .from("event_teams")
    .insert({
      event_id: v.event_id, name: v.team_name, college: college || null,
      lead_name: lead.name, lead_email: lead.email, lead_phone: v.lead_phone,
      member_count: v.members.length,
    })
    .select("id").single();
  if (teamErr) {
    if (teamErr.code === "23505") return { ok: false, error: "A team with that name already exists for this event." };
    return { ok: false, error: teamErr.message };
  }

  // One confirmed registration (with QR) per member. Fee charged to the lead.
  const nowIso = new Date().toISOString();
  const rows = v.members.map((m, i) => ({
    event_id: v.event_id,
    tier_id: null,
    user_id: null,
    attendee_name: m.name,
    attendee_email: m.email,
    attendee_phone: i === 0 ? v.lead_phone : null,
    status: "confirmed",
    confirmed_at: nowIso,
    amount_paise: i === 0 ? (ev.entry_fee_paise ?? 0) : 0,
    team_id: team.id,
    is_team_lead: i === 0,
    metadata: { source: "hackathon_team", team_name: v.team_name, college: college || null },
  }));
  const { data: inserted, error: regErr } = await svc
    .from("registrations").insert(rows).select("attendee_email, qr_token, event_id, id");
  if (regErr) {
    // roll back the team so a retry can re-use the name
    await svc.from("event_teams").delete().eq("id", team.id);
    return { ok: false, error: regErr.message };
  }

  // Email each member their confirmation + QR.
  for (const r of inserted ?? []) {
    await enqueue({
      registration_id: r.id, event_id: r.event_id, channel: "email",
      template: "registration_confirmed", recipient: r.attendee_email,
      payload: { qr_token: r.qr_token },
    });
  }

  revalidatePath(`/events/${ev.slug}`);
  revalidatePath(`/dashboard/events/${v.event_id}`);
  const leadReg = (inserted ?? []).find((r) => r.attendee_email.toLowerCase() === lead.email.toLowerCase());
  return { ok: true, qr_token: leadReg?.qr_token ?? "", slug: ev.slug };
}
