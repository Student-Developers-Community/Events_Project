import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { listEventAttendees, type ListAttendeesOpts } from "@/lib/db/event-attendees";
import { toCsv } from "@/lib/csv";

/**
 * GET /dashboard/events/[id]/attendees/export?status=...&q=...
 * Streams attendees as CSV. RLS-gated via the organiser session.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const sb = await getSupabaseServerClient();
  if (!sb) return new NextResponse("Server not configured", { status: 500 });

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id: eventId } = await ctx.params;
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const q      = url.searchParams.get("q") ?? undefined;

  // Get event for the filename (and to verify ownership before the heavier query)
  const { data: ev } = await sb
    .from("events")
    .select("slug, title")
    .eq("id", eventId)
    .eq("organiser_id", user.id)
    .maybeSingle();
  if (!ev) return new NextResponse("Not found", { status: 404 });

  const rows = await listEventAttendees(eventId, {
    status: status as ListAttendeesOpts["status"],
    q: q ?? undefined,
  });

  const headers = [
    "Name", "Email", "Phone", "Tier",
    "Status", "Amount (₹)", "Registered at", "Confirmed at", "Checked in at",
  ];

  const data = rows.map((r) => ({
    "Name":           r.attendee_name,
    "Email":          r.attendee_email,
    "Phone":          r.attendee_phone ?? "",
    "Tier":           r.ticket_tiers?.name ?? "",
    "Status":         r.status,
    "Amount (₹)":     (r.amount_paise / 100).toFixed(0),
    "Registered at":  r.created_at,
    "Confirmed at":   r.confirmed_at ?? "",
    "Checked in at":  r.checked_in_at ?? "",
  }));

  const csv = toCsv(data, headers);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${ev.slug}-attendees-${dateStr}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
