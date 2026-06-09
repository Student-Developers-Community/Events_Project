import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { EventListItem, PublicEvent, PublicTier } from "./types";

/**
 * List upcoming, published, public events for the Discover page.
 * Fetches events + tiers in two queries (cheaper than a join for small N)
 * and computes `min_price_paise` + `any_tier_available` per event.
 */
export async function listPublicEvents(opts?: {
  limit?: number;
  city?: string;
  category?: string;
}): Promise<EventListItem[]> {
  const sb = await getSupabaseServerClient();
  if (!sb) return [];

  let q = sb
    .from("v_events_public")
    .select("*")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(opts?.limit ?? 60);

  if (opts?.city)     q = q.eq("city", opts.city);
  if (opts?.category) q = q.eq("category", opts.category);

  const { data: events, error } = await q;
  if (error) {
    console.error("[listPublicEvents] events error:", error.message);
    return [];
  }
  if (!events || events.length === 0) return [];

  const eventIds = (events as PublicEvent[]).map((e) => e.id);
  const { data: tiers, error: tiersErr } = await sb
    .from("v_tiers_public")
    .select("*")
    .in("event_id", eventIds);

  if (tiersErr) {
    console.error("[listPublicEvents] tiers error:", tiersErr.message);
  }

  const tiersByEvent = new Map<string, PublicTier[]>();
  for (const t of (tiers ?? []) as PublicTier[]) {
    const list = tiersByEvent.get(t.event_id) ?? [];
    list.push(t);
    tiersByEvent.set(t.event_id, list);
  }

  return (events as PublicEvent[]).map((e) => {
    const ts = tiersByEvent.get(e.id) ?? [];
    const available = ts.filter((t) => !t.is_sold_out);
    return {
      ...e,
      min_price_paise: ts.length === 0 ? null : Math.min(...ts.map((t) => t.price_paise)),
      any_tier_available: available.length > 0,
    };
  });
}

export async function getPublicEventBySlug(slug: string): Promise<{
  event: PublicEvent;
  tiers: PublicTier[];
} | null> {
  const sb = await getSupabaseServerClient();
  if (!sb) return null;

  const { data: event } = await sb
    .from("v_events_public")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!event) return null;

  const { data: tiers } = await sb
    .from("v_tiers_public")
    .select("*")
    .eq("event_id", (event as PublicEvent).id)
    .order("sort_order", { ascending: true });

  return { event: event as PublicEvent, tiers: (tiers ?? []) as PublicTier[] };
}
