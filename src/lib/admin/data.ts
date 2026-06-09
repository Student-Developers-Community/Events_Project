import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

/** Service-role reads for the super-admin portal. Always gate the CALLER
 *  with requireSuperAdmin() before using these — they bypass RLS. */

export type AdminEventRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  approval_status: string;
  category: string;
  starts_at: string;
  city: string | null;
  is_online: boolean;
  created_at: string;
  organiser_name: string;
  organiser_email: string;
  registrations: number;
};

export type PlatformStats = {
  pending: number;
  live: number;
  draft: number;
  total_events: number;
  total_registrations: number;
};

export async function getPlatformStats(): Promise<PlatformStats> {
  const svc = getSupabaseServiceClient();
  if (!svc) return { pending: 0, live: 0, draft: 0, total_events: 0, total_registrations: 0 };

  const countWhere = async (col: string, val: string) => {
    const { count } = await svc.from("events").select("id", { count: "exact", head: true })
      .is("deleted_at", null).eq(col, val);
    return count ?? 0;
  };
  const liveQ = await svc.from("events").select("id", { count: "exact", head: true })
    .is("deleted_at", null).eq("status", "published").eq("approval_status", "approved");
  const totalEv = await svc.from("events").select("id", { count: "exact", head: true }).is("deleted_at", null);
  const totalReg = await svc.from("registrations").select("id", { count: "exact", head: true }).is("deleted_at", null);

  return {
    pending: await countWhere("approval_status", "pending"),
    live: liveQ.count ?? 0,
    draft: await countWhere("status", "draft"),
    total_events: totalEv.count ?? 0,
    total_registrations: totalReg.count ?? 0,
  };
}

export async function listEventsForAdmin(filter?: "pending" | "live" | "all"): Promise<AdminEventRow[]> {
  const svc = getSupabaseServiceClient();
  if (!svc) return [];

  let q = svc.from("events")
    .select(`
      id, slug, title, status, approval_status, category, starts_at, city, is_online, created_at,
      organisers ( display_name, email )
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filter === "pending") q = q.eq("approval_status", "pending");
  if (filter === "live")    q = q.eq("status", "published").eq("approval_status", "approved");

  const { data } = await q;
  if (!data) return [];

  // per-event registration counts
  const rows = await Promise.all(data.map(async (e) => {
    const o = Array.isArray(e.organisers) ? e.organisers[0] : e.organisers;
    const { count } = await svc.from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", e.id).is("deleted_at", null);
    return {
      id: e.id, slug: e.slug, title: e.title, status: e.status,
      approval_status: e.approval_status, category: e.category,
      starts_at: e.starts_at, city: e.city, is_online: e.is_online, created_at: e.created_at,
      organiser_name: o?.display_name ?? "—",
      organiser_email: o?.email ?? "—",
      registrations: count ?? 0,
    } as AdminEventRow;
  }));
  return rows;
}

export async function getEventForAdmin(id: string) {
  const svc = getSupabaseServiceClient();
  if (!svc) return null;

  const { data: event } = await svc.from("events")
    .select(`*, organisers ( display_name, email )`)
    .eq("id", id).is("deleted_at", null).maybeSingle();
  if (!event) return null;

  const organiser = Array.isArray(event.organisers) ? event.organisers[0] : event.organisers;

  const { data: tiers } = await svc.from("ticket_tiers")
    .select("id, name, price_paise, capacity, sold_count, is_active")
    .eq("event_id", id).is("deleted_at", null).order("sort_order");

  const { data: regs } = await svc.from("registrations")
    .select("id, attendee_name, attendee_email, attendee_phone, status, amount_paise, created_at, checked_in_at, qr_token")
    .eq("event_id", id).is("deleted_at", null).order("created_at", { ascending: false });

  const list = regs ?? [];
  const insights = {
    registered: list.filter((r) => ["pending", "confirmed", "checked_in"].includes(r.status)).length,
    confirmed:  list.filter((r) => ["confirmed", "checked_in"].includes(r.status)).length,
    checked_in: list.filter((r) => r.status === "checked_in").length,
    revenue_paise: list.filter((r) => ["confirmed", "checked_in"].includes(r.status)).reduce((s, r) => s + (r.amount_paise || 0), 0),
  };

  return { event, organiser, tiers: tiers ?? [], registrations: list, insights };
}
