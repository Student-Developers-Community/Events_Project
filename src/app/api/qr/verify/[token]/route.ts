import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Informational page if someone scans the entry QR with their own phone
 * camera. The actual check-in mutation happens via Server Action from the
 * organiser dashboard scanner — never via this endpoint.
 *
 * Returns a small HTML page; clients/scanners that want JSON can include
 * `Accept: application/json`.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await ctx.params;
  const wantsJson = req.headers.get("accept")?.includes("application/json");

  const sb = await getSupabaseServerClient();
  let event: { title: string; slug: string } | null = null;
  let attendeeName: string | null = null;

  if (sb) {
    const { data } = await sb
      .from("registrations")
      .select("attendee_name, events ( title, slug )")
      .eq("qr_token", token)
      .maybeSingle();
    attendeeName = data?.attendee_name ?? null;
    const ev = Array.isArray(data?.events) ? data.events[0] : data?.events;
    event = ev ? { title: ev.title, slug: ev.slug } : null;
  }

  if (wantsJson) {
    return NextResponse.json({ token, event, attendee: attendeeName });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const ticketUrl = event ? `${baseUrl}/events/${event.slug}/register/success?qr=${encodeURIComponent(token)}` : "/my-tickets";

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${event ? `Ticket · ${event.title}` : "Ticket"}</title>
<style>
  body{margin:0;background:#000;color:#fff;font-family:Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}
  .card{background:#0a0a14;border:1px solid #1a1a2a;border-radius:14px;padding:28px;max-width:380px;width:100%;text-align:center;}
  .pill{display:inline-block;background:rgba(124, 92, 255,0.15);color:#b9a7ff;border:1px solid rgba(124, 92, 255,0.3);padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:18px;}
  h1{margin:0 0 8px 0;font-size:22px;letter-spacing:-0.02em;}
  p{margin:0 0 18px 0;font-size:14px;color:#6a6a80;line-height:1.5;}
  a.btn{display:inline-block;background:linear-gradient(135deg,#7c5cff,#00d4ff);color:#001a10;text-decoration:none;font-weight:700;font-size:14px;padding:11px 18px;border-radius:8px;}
  .muted{font-size:12px;color:#404056;margin-top:18px;}
</style></head>
<body><div class="card">
  <span class="pill">Entry QR</span>
  <h1>${event ? event.title : "Your TechEvent ticket"}</h1>
  ${attendeeName ? `<p>${attendeeName}, this is your entry pass.<br>The organiser will scan it at the door.</p>` : `<p>This is a TechEvent entry pass. The organiser will scan it at the door.</p>`}
  <a class="btn" href="${ticketUrl}">View ticket page →</a>
  <p class="muted">Don't share this URL — it grants entry.</p>
</div></body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
