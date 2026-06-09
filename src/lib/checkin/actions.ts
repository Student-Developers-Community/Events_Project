"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type CheckinResult =
  | { ok: true;  state: "checked_in";   attendee_name: string; tier_name: string; team_name: string | null; }
  | { ok: false; state: "already_in";   attendee_name: string; checked_in_at: string; }
  | { ok: false; state: "not_confirmed"; attendee_name: string; status: string; }
  | { ok: false; state: "wrong_event";  message: string; }
  | { ok: false; state: "not_found";    message: string; }
  | { ok: false; state: "forbidden";    message: string; };

/**
 * Check an attendee in by QR token. Called by the dashboard scanner.
 * RLS-gated: only the event's organiser can run this (their session
 * client has update + insert rights for their own event).
 *
 * Always writes to `checkins` (audit log) — success and failure both.
 */
export async function checkInAction(
  eventId: string,
  qrToken: string,
): Promise<CheckinResult> {
  const sb = await getSupabaseServerClient();
  if (!sb) return { ok: false, state: "forbidden", message: "Server not configured" };

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, state: "forbidden", message: "Not signed in" };

  // Confirm the organiser owns this event
  const { data: event } = await sb
    .from("events")
    .select("id, organiser_id, title")
    .eq("id", eventId)
    .eq("organiser_id", user.id)
    .maybeSingle();
  if (!event) return { ok: false, state: "forbidden", message: "You don't own this event" };

  // Look up the registration by QR token (RLS lets organiser read their event's regs)
  const { data: reg } = await sb
    .from("registrations")
    .select(`
      id, event_id, status, attendee_name, checked_in_at,
      ticket_tiers ( name ),
      teams ( name )
    `)
    .eq("qr_token", qrToken)
    .is("deleted_at", null)
    .maybeSingle();

  // Log the scan attempt to checkins (audit). Do this for every branch.
  const logScan = async (success: boolean, reason: string | null, regId: string | null) => {
    await sb.from("checkins").insert({
      registration_id: regId,
      event_id: eventId,
      scanned_by: user.id,
      success,
      failure_reason: reason,
    });
  };

  if (!reg) {
    await logScan(false, "qr_not_found", null);
    return { ok: false, state: "not_found", message: "QR not recognised." };
  }
  if (reg.event_id !== eventId) {
    await logScan(false, "wrong_event", reg.id);
    return { ok: false, state: "wrong_event", message: "This QR is for a different event." };
  }

  const tierName = (Array.isArray(reg.ticket_tiers) ? reg.ticket_tiers[0] : reg.ticket_tiers)?.name ?? "Ticket";
  const teamName = (Array.isArray(reg.teams)        ? reg.teams[0]        : reg.teams)?.name ?? null;

  if (reg.status === "checked_in") {
    await logScan(false, "already_checked_in", reg.id);
    return {
      ok: false,
      state: "already_in",
      attendee_name: reg.attendee_name,
      checked_in_at: reg.checked_in_at ?? "",
    };
  }
  if (reg.status !== "confirmed") {
    await logScan(false, `status_${reg.status}`, reg.id);
    return {
      ok: false,
      state: "not_confirmed",
      attendee_name: reg.attendee_name,
      status: reg.status,
    };
  }

  // Happy path — flip to checked_in
  const { error: updErr } = await sb
    .from("registrations")
    .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
    .eq("id", reg.id);

  if (updErr) {
    await logScan(false, `update_error:${updErr.message}`, reg.id);
    return { ok: false, state: "forbidden", message: updErr.message };
  }

  await logScan(true, null, reg.id);
  return {
    ok: true,
    state: "checked_in",
    attendee_name: reg.attendee_name,
    tier_name: tierName,
    team_name: teamName,
  };
}

export async function getCheckinStats(eventId: string): Promise<{
  confirmed: number;
  checked_in: number;
}> {
  const sb = await getSupabaseServerClient();
  if (!sb) return { confirmed: 0, checked_in: 0 };

  const { count: checkedIn } = await sb
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "checked_in")
    .is("deleted_at", null);

  const { count: confirmed } = await sb
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("status", ["confirmed", "checked_in"])
    .is("deleted_at", null);

  return { confirmed: confirmed ?? 0, checked_in: checkedIn ?? 0 };
}
