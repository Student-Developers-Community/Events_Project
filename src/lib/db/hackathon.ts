import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { EventCollege } from "./types";

/** Allowed colleges for an event. Public-readable for visible events (RLS). */
export async function listEventColleges(eventId: string): Promise<EventCollege[]> {
  const sb = await getSupabaseServerClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("event_colleges")
    .select("id, name, team_quota")
    .eq("event_id", eventId)
    .order("name", { ascending: true });
  if (error) { console.error("[listEventColleges]", error.message); return []; }
  return (data ?? []) as EventCollege[];
}

export type TeamRow = {
  id: string;
  name: string;
  college: string | null;
  lead_name: string;
  lead_email: string;
  lead_phone: string | null;
  member_count: number;
  created_at: string;
};

/** Teams for an event the current organiser owns (RLS-gated). */
export async function listEventTeams(eventId: string): Promise<TeamRow[]> {
  const sb = await getSupabaseServerClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("event_teams")
    .select("id, name, college, lead_name, lead_email, lead_phone, member_count, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[listEventTeams]", error.message); return []; }
  return (data ?? []) as TeamRow[];
}
