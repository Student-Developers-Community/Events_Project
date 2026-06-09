import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AttendeeRow = {
  id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string | null;
  status: string;
  amount_paise: number;
  created_at: string;
  confirmed_at: string | null;
  checked_in_at: string | null;
  ticket_tiers: { name: string } | null;
};

export type ListAttendeesOpts = {
  status?: "all" | "confirmed" | "checked_in" | "pending" | "cancelled" | "refunded";
  q?: string;
};

/**
 * List attendees for an event owned by the current organiser.
 * RLS already gates this (organiser sees all regs for their events) —
 * we just verify ownership for a friendly 404 instead of an empty list.
 */
export async function listEventAttendees(
  eventId: string,
  opts: ListAttendeesOpts = {},
): Promise<AttendeeRow[]> {
  const sb = await getSupabaseServerClient();
  if (!sb) return [];

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  // Confirm ownership
  const { data: ev } = await sb
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organiser_id", user.id)
    .maybeSingle();
  if (!ev) return [];

  let q = sb
    .from("registrations")
    .select(`
      id, attendee_name, attendee_email, attendee_phone, status,
      amount_paise, created_at, confirmed_at, checked_in_at,
      ticket_tiers ( name )
    `)
    .eq("event_id", eventId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (opts.status && opts.status !== "all") {
    q = q.eq("status", opts.status);
  }
  if (opts.q && opts.q.trim()) {
    const term = opts.q.trim().replace(/[%,]/g, "");
    q = q.or(`attendee_name.ilike.%${term}%,attendee_email.ilike.%${term}%`);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[listEventAttendees]", error.message);
    return [];
  }

  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as AttendeeRow & {
      ticket_tiers: AttendeeRow["ticket_tiers"] | AttendeeRow["ticket_tiers"][];
    };
    const tier = Array.isArray(r.ticket_tiers) ? r.ticket_tiers[0] ?? null : r.ticket_tiers;
    return { ...r, ticket_tiers: tier } as AttendeeRow;
  });
}
