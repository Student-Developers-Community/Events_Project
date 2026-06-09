import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type MyTicketRow = {
  id: string;
  qr_token: string;
  status: string;
  attendee_name: string;
  amount_paise: number;
  confirmed_at: string | null;
  events: {
    slug: string;
    title: string;
    starts_at: string;
    timezone: string;
    venue_name: string | null;
    city: string | null;
    is_online: boolean;
    category: string;
    cover_image_url: string | null;
  } | null;
};

/** All registrations linked to the current logged-in user. */
export async function listMyTickets(): Promise<MyTicketRow[]> {
  const sb = await getSupabaseServerClient();
  if (!sb) return [];

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  const { data, error } = await sb
    .from("registrations")
    .select(`
      id, qr_token, status, attendee_name, amount_paise, confirmed_at,
      events (
        slug, title, starts_at, timezone, venue_name, city, is_online,
        category, cover_image_url
      )
    `)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listMyTickets]", error.message);
    return [];
  }

  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as MyTicketRow & {
      events: MyTicketRow["events"] | MyTicketRow["events"][];
    };
    const ev = Array.isArray(r.events) ? r.events[0] ?? null : r.events;
    return { ...r, events: ev } as MyTicketRow;
  });
}
