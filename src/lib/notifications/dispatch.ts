import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "./email-sender";
import { renderRegistrationConfirmed } from "./templates/registration-confirmed";
import { renderEventReminder } from "./templates/event-reminder";
import { generateICS } from "@/lib/calendar";

/**
 * Notification dispatcher — outbox pattern.
 *
 * enqueue()  → writes an outbox row. If it's due now (no scheduledFor, or in
 *              the past) and channel=email, it delivers immediately. Future
 *              rows stay 'queued' for the cron to pick up.
 * processDueNotifications() → called by /api/cron/dispatch on a schedule;
 *              delivers all queued rows whose scheduled_for has passed.
 */

export type OutboxTemplate = "registration_confirmed" | "event_reminder";

export type OutboxRow = {
  registration_id: string;
  event_id: string;
  channel: "email" | "whatsapp" | "sms";
  template: OutboxTemplate;
  recipient: string;
  payload: Record<string, unknown>;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function enqueue(
  row: OutboxRow,
  opts?: { scheduledFor?: string },
): Promise<void> {
  const sb = getSupabaseServiceClient();
  if (!sb) {
    console.warn("[notifications] no service key — dryrun log only", row);
    return;
  }

  const scheduledFor = opts?.scheduledFor ?? new Date().toISOString();
  const dueNow = new Date(scheduledFor).getTime() <= Date.now();

  const { data: inserted, error } = await sb
    .from("notifications_outbox")
    .insert({
      registration_id: row.registration_id,
      event_id: row.event_id,
      channel: row.channel,
      template: row.template,
      recipient: row.recipient,
      payload: row.payload,
      status: "queued",
      scheduled_for: scheduledFor,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[notifications.enqueue]", error.message);
    return;
  }

  // Only email is wired. Deliver now if due; else leave for the cron.
  if (row.channel === "email" && dueNow) {
    await deliver(inserted.id);
  } else {
    console.log(`[notifications.queued] ${row.channel}:${row.template} → ${row.recipient} @ ${scheduledFor}`);
  }
}

/** Cron entrypoint — deliver everything due. Returns counts. */
export async function processDueNotifications(limit = 100): Promise<{ sent: number; failed: number }> {
  const sb = getSupabaseServiceClient();
  if (!sb) return { sent: 0, failed: 0 };

  const { data: due } = await sb
    .from("notifications_outbox")
    .select("id")
    .eq("status", "queued")
    .eq("channel", "email")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  let sent = 0, failed = 0;
  for (const r of due ?? []) {
    const ok = await deliver(r.id);
    if (ok) sent++; else failed++;
  }
  return { sent, failed };
}

/** Render + send a single outbox row, then mark its status. */
async function deliver(outboxId: string): Promise<boolean> {
  const sb = getSupabaseServiceClient();
  if (!sb) return false;

  const { data: row } = await sb
    .from("notifications_outbox")
    .select("id, template, recipient, payload, registration_id")
    .eq("id", outboxId)
    .maybeSingle();
  if (!row) return false;

  const ctx = await loadContext(row.registration_id);
  if (!ctx) { await mark(outboxId, "failed", "context not found"); return false; }

  let subject: string, html: string, text: string;
  let attachments: { filename: string; content: string; contentType: string }[] | undefined;

  if (row.template === "event_reminder") {
    const window = (row.payload?.window as "24h" | "1h") ?? "24h";
    ({ subject, html, text } = renderEventReminder({ ...ctx, window }));
  } else {
    ({ subject, html, text } = renderRegistrationConfirmed(ctx));
    // attach .ics to the confirmation
    const ics = generateICS({
      uid: ctx.qr_token,
      title: ctx.event_title,
      description: ctx.event_subtitle,
      location: ctx.event_is_online ? (ctx.event_online_url || "Online") : (ctx.event_venue_name || ctx.event_city || "TBA"),
      startsAt: ctx.event_starts_at,
      endsAt: ctx.event_ends_at,
      url: `${ctx.app_url}/events/${ctx.event_slug}`,
      organiserName: ctx.organiser_name,
    });
    attachments = [{ filename: `${ctx.event_slug}.ics`, content: ics, contentType: "text/calendar; charset=utf-8" }];
  }

  const result = await sendEmail({ to: row.recipient, subject, html, text, attachments });

  if (result.ok) {
    await mark(outboxId, "sent");
    console.log(`[notifications.sent] ${row.template} → ${row.recipient}`);
    return true;
  }
  if (result.dryrun) {
    console.log(`[notifications.dryrun] ${row.template} → ${row.recipient} (SMTP not configured)`);
    return false; // leave queued
  }
  await mark(outboxId, "failed", result.error);
  return false;
}

/** Load everything both templates + the .ics need, fresh at send time. */
async function loadContext(registrationId: string) {
  const sb = getSupabaseServiceClient();
  if (!sb) return null;

  const { data: reg } = await sb
    .from("registrations")
    .select(`
      attendee_name, attendee_email, amount_paise, qr_token,
      events (
        slug, title, subtitle, starts_at, ends_at, timezone,
        venue_name, city, is_online, online_url, organiser_id
      ),
      ticket_tiers ( name )
    `)
    .eq("id", registrationId)
    .maybeSingle();
  if (!reg) return null;

  const ev   = Array.isArray(reg.events)       ? reg.events[0]       : reg.events;
  const tier = Array.isArray(reg.ticket_tiers) ? reg.ticket_tiers[0] : reg.ticket_tiers;
  if (!ev) return null;

  const { data: organiser } = await sb
    .from("organisers")
    .select("display_name")
    .eq("id", ev.organiser_id)
    .maybeSingle();

  return {
    attendee_name: reg.attendee_name,
    attendee_email: reg.attendee_email,
    event_title: ev.title,
    event_subtitle: ev.subtitle,
    event_starts_at: ev.starts_at,
    event_ends_at: ev.ends_at,
    event_timezone: ev.timezone,
    event_is_online: ev.is_online,
    event_venue_name: ev.venue_name,
    event_city: ev.city,
    event_online_url: ev.online_url,
    event_slug: ev.slug,
    organiser_name: organiser?.display_name ?? "TechEvent organiser",
    tier_name: tier?.name ?? "General",
    amount_paise: reg.amount_paise,
    qr_token: reg.qr_token,
    app_url: APP_URL,
  };
}

async function mark(id: string, status: "sent" | "failed", lastError?: string): Promise<void> {
  const sb = getSupabaseServiceClient();
  if (!sb) return;
  await sb
    .from("notifications_outbox")
    .update({
      status,
      attempts: status === "failed" ? 1 : 0,
      last_error: lastError ?? null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", id);
}
