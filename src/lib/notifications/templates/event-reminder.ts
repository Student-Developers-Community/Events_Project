import { formatEventDate } from "@/lib/format";

export type ReminderTemplateData = {
  attendee_name: string;
  event_title: string;
  event_starts_at: string;
  event_timezone: string;
  event_is_online: boolean;
  event_venue_name: string | null;
  event_city: string | null;
  event_online_url: string | null;
  event_slug: string;
  qr_token: string;
  app_url: string;
  /** "24h" or "1h" — controls the headline copy */
  window: "24h" | "1h";
};

type Rendered = { subject: string; html: string; text: string };

export function renderEventReminder(d: ReminderTemplateData): Rendered {
  const when     = formatEventDate(d.event_starts_at, d.event_timezone);
  const where    = d.event_is_online
    ? (d.event_online_url || "Online")
    : (d.event_venue_name || d.event_city || "Venue TBA");
  const qrPngUrl  = `${d.app_url}/api/qr/png/${encodeURIComponent(d.qr_token)}`;
  const ticketUrl = `${d.app_url}/events/${d.event_slug}/register/success?qr=${encodeURIComponent(d.qr_token)}`;

  const lead = d.window === "1h" ? "Starting in ~1 hour" : "Happening tomorrow";
  const subject = d.window === "1h"
    ? `Starting soon · ${d.event_title}`
    : `Tomorrow · ${d.event_title}`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:Helvetica,Arial,sans-serif;color:#fff;">
<div style="background:#000;padding:24px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;">
    <tr><td style="padding:0 24px 16px 24px;">
      <table role="presentation"><tr>
        <td style="background:linear-gradient(135deg,#7c5cff,#00d4ff);color:#001a10;font-weight:900;font-size:12px;padding:6px 10px;border-radius:6px;">TE</td>
        <td style="padding-left:10px;color:#fff;font-weight:bold;font-size:15px;">TechEvent</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:0 24px 8px 24px;">
      <span style="display:inline-block;background:rgba(0,212,255,0.15);color:#b9a7ff;border:1px solid rgba(0,212,255,0.3);padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;">⏰ ${lead}</span>
    </td></tr>
    <tr><td style="padding:0 24px 8px 24px;">
      <h1 style="margin:0;font-size:24px;line-height:1.15;letter-spacing:-0.02em;color:#fff;">${esc(d.event_title)}</h1>
    </td></tr>
    <tr><td style="padding:8px 24px 18px 24px;">
      <p style="margin:0 0 6px 0;font-size:14px;color:#fff;">📅 ${esc(when)}</p>
      <p style="margin:0;font-size:14px;color:#fff;">📍 ${esc(where)}</p>
    </td></tr>
    <tr><td style="padding:0 24px 18px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000;border:1px solid #1a1a2a;border-radius:10px;">
        <tr><td style="text-align:center;padding:22px 24px 10px 24px;">
          <img src="${qrPngUrl}" alt="Your entry QR" width="200" height="200" style="display:block;margin:0 auto;border-radius:8px;" />
        </td></tr>
        <tr><td style="text-align:center;padding:0 24px 20px 24px;font-size:12px;color:#6a6a80;">Your entry QR — show this at the door</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 24px 28px 24px;">
      <a href="${ticketUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c5cff,#00d4ff);color:#001a10;text-decoration:none;font-weight:700;font-size:14px;padding:11px 18px;border-radius:8px;">View ticket →</a>
    </td></tr>
    <tr><td style="padding:0 24px 32px 24px;font-size:12px;color:#6a6a80;">See you there! · TechEvent</td></tr>
  </table>
</div>
</body></html>`;

  const text = [
    `${lead.toUpperCase()}`,
    ``,
    d.event_title,
    `When:  ${when}`,
    `Where: ${where}`,
    ``,
    `Your QR: ${qrPngUrl}`,
    `Ticket:  ${ticketUrl}`,
    ``,
    `See you there! · TechEvent`,
  ].join("\n");

  return { subject, html, text };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
