import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { EventStatus, EventCategory } from "./types";

export type OrganiserEventRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  status: EventStatus;
  approval_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  category: EventCategory;
  starts_at: string;
  ends_at: string;
  city: string | null;
  venue_name: string | null;
  is_online: boolean;
  total_capacity: number | null;
  cover_image_url: string | null;
  description: string | null;
  online_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

export type OrganiserTierRow = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_paise: number;
  capacity: number | null;
  sold_count: number;
  sort_order: number;
  is_active: boolean;
};

/** Events owned by the currently-logged-in organiser. */
export async function listMyEvents(): Promise<OrganiserEventRow[]> {
  const sb = await getSupabaseServerClient();
  if (!sb) return [];
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  const { data, error } = await sb
    .from("events")
    .select("id, slug, title, subtitle, status, approval_status, rejection_reason, category, starts_at, ends_at, city, venue_name, is_online, total_capacity, cover_image_url, description, online_url, contact_email, contact_phone")
    .eq("organiser_id", user.id)
    .is("deleted_at", null)
    .order("starts_at", { ascending: false });

  if (error) {
    console.error("[listMyEvents]", error.message);
    return [];
  }
  return (data ?? []) as OrganiserEventRow[];
}

/** A single event owned by the current organiser. Returns null if not theirs. */
export async function getMyEventById(id: string): Promise<{
  event: OrganiserEventRow;
  tiers: OrganiserTierRow[];
  attendee_count: number;
} | null> {
  const sb = await getSupabaseServerClient();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data: event } = await sb
    .from("events")
    .select("id, slug, title, subtitle, status, approval_status, rejection_reason, category, starts_at, ends_at, city, venue_name, is_online, total_capacity, cover_image_url, description, online_url, contact_email, contact_phone")
    .eq("id", id)
    .eq("organiser_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!event) return null;

  const { data: tiers } = await sb
    .from("ticket_tiers")
    .select("id, event_id, name, description, price_paise, capacity, sold_count, sort_order, is_active")
    .eq("event_id", id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  const { count } = await sb
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", id)
    .in("status", ["confirmed", "checked_in"])
    .is("deleted_at", null);

  return {
    event: event as OrganiserEventRow,
    tiers: (tiers ?? []) as OrganiserTierRow[],
    attendee_count: count ?? 0,
  };
}
