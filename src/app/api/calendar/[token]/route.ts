import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { generateICS } from "@/lib/calendar";

/**
 * GET /api/calendar/[token]  → downloads a .ics for the registration's event.
 * Token = registration qr_token (the bearer credential).
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await ctx.params;
  if (!token || token.length < 8) {
    return new NextResponse("Invalid token", { status: 400 });
  }

  // qr_token is the bearer credential → read via service role (RLS won't expose
  // a guest's own registration by token).
  const sb = getSupabaseServiceClient();
  if (!sb) return new NextResponse("Server not configured", { status: 500 });

  const { data: reg } = await sb
    .from("registrations")
    .select(`
      qr_token,
      events ( title, description, starts_at, ends_at, venue_name, city, is_online, online_url, slug )
    `)
    .eq("qr_token", token)
    .maybeSingle();

  const ev = Array.isArray(reg?.events) ? reg.events[0] : reg?.events;
  if (!ev) return new NextResponse("Not found", { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const location = ev.is_online
    ? (ev.online_url || "Online")
    : [ev.venue_name, ev.city].filter(Boolean).join(", ") || "TBA";

  const ics = generateICS({
    uid: token,
    title: ev.title,
    description: ev.description,
    location,
    startsAt: ev.starts_at,
    endsAt: ev.ends_at,
    url: `${baseUrl}/events/${ev.slug}`,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ev.slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
