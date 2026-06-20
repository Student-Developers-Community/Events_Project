import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type Blast = {
  id: string;
  message: string;
  created_at: string;
};

/**
 * Announcements for an event, newest first. RLS handles visibility:
 * organiser sees their own event's blasts; the public sees blasts for
 * published/approved/public events.
 */
export async function listEventBlasts(eventId: string): Promise<Blast[]> {
  const sb = await getSupabaseServerClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("event_blasts")
    .select("id, message, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[listEventBlasts]", error.message);
    return [];
  }
  return (data ?? []) as Blast[];
}
