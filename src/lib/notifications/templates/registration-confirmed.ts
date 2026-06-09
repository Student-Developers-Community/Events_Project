import { formatINR, formatEventDate } from "@/lib/format";

export type ConfirmedTemplateData = {
  attendee_name: string;
  attendee_email: string;
  event_title: string;
  event_subtitle: string | null;
  event_starts_at: string;
  event_timezone: string;
  event_is_online: boolean;
  event_venue_name: string | null;
  event_city: string | null;
  event_slug: string;
  organiser_name: string;
  tier_name: string;
  amount_paise: number;
  qr_token: string;
  app_url: string;
};

type Rendered = { subject: string; html: string; text: string };

export function renderRegistrationConfirmed(d: ConfirmedTemplateData): Rendered {
  const when     = formatEventDate(d.event_starts_at, d.event_timezone);
  const where    = d.event_is_online ? "Online" : (d.event_venue_name || d.event_city || "Venue TBA");
  const qrPngUrl = `${d.app_url}/api/qr/png/${encodeURIComponent(d.qr_token)}`;
  const ticketUrl = `${d.app_url}/events/${d.event_slug}/register/success?qr=${encodeURIComponent(d.qr_token)}`;

  const subject = `You're in! · ${d.event_title} · ${when.split(" · ").slice(0, 2).join(" · ")}`;

  // ── HTML (dark/mint, inline styles only — mail clients strip <style>) ──
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:Helvetica,Arial,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;">

<div style="background:#000;padding:24px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;">

    <tr><td style="padding:0 24px 20px 24px;">
      <table role="presentation"><tr>
        <td style="background:linear-gradient(135deg,#00ff9d,#00d4ff);color:#001a10;font-weight:900;font-size:12px;padding:6px 10px;border-radius:6px;">TE</td>
        <td style="padding-left:10px;color:#fff;font-weight:bold;font-size:15px;">TechEvent</td>
      </tr></table>
    </td></tr>

    <tr><td style="padding:0 24px 16px 24px;">
      <span style="display:inline-block;background:rgba(0,255,157,0.15);color:#80ffd1;border:1px solid rgba(0,255,157,0.3);padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;">✓ Ticket confirmed</span>
    </td></tr>

    <tr><td style="padding:0 24px 8px 24px;">
      <h1 style="margin:0;font-size:26px;line-height:1.1;letter-spacing:-0.02em;color:#fff;">${escape(d.event_title)}</h1>
    </td></tr>
    ${d.event_subtitle ? `
    <tr><td style="padding:0 24px 24px 24px;">
      <p style="margin:0;font-size:14px;line-height:1.5;color:#6a6a80;">${escape(d.event_subtitle)}</p>
    </td></tr>` : `<tr><td style="height:18px;"></td></tr>`}

    <tr><td style="padding:0 24px 18px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a14;border:1px solid #1a1a2a;border-radius:10px;">
        <tr><td style="padding:14px 18px;font-size:13.5px;color:#fff;border-bottom:1px solid #1a1a2a;">📅 &nbsp;${escape(when)}</td></tr>
        <tr><td style="padding:14px 18px;font-size:13.5px;color:#fff;border-bottom:1px solid #1a1a2a;">📍 &nbsp;${escape(where)}</td></tr>
        <tr><td style="padding:14px 18px;font-size:13.5px;color:#fff;border-bottom:1px solid #1a1a2a;">🎟️ &nbsp;${escape(d.tier_name)} · <span style="color:#00ff9d;">${formatINR(d.amount_paise)}</span></td></tr>
        <tr><td style="padding:14px 18px;font-size:13.5px;color:#fff;">👤 &nbsp;${escape(d.attendee_name)} <span style="color:#6a6a80;">(${escape(d.attendee_email)})</span></td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:0 24px 18px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000;border:1px solid #1a1a2a;border-radius:10px;">
        <tr><td style="text-align:center;padding:24px 24px 12px 24px;">
          <img src="${qrPngUrl}" alt="Your entry QR" width="240" height="240" style="display:block;margin:0 auto;border-radius:8px;" />
        </td></tr>
        <tr><td style="text-align:center;padding:0 24px 22px 24px;font-size:12px;color:#6a6a80;">
          Show this QR at the door for entry · Single-use
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:0 24px 24px 24px;">
      <a href="${ticketUrl}" style="display:inline-block;background:linear-gradient(135deg,#00ff9d,#00d4ff);color:#001a10;text-decoration:none;font-weight:700;font-size:14px;padding:11px 18px;border-radius:8px;">View ticket page →</a>
    </td></tr>

    <tr><td style="padding:0 24px 32px 24px;font-size:12px;color:#6a6a80;line-height:1.6;">
      <p style="margin:0;">Organised by <span style="color:#fff;">${escape(d.organiser_name)}</span> · TechEvent</p>
      <p style="margin:10px 0 0 0;">Manage your tickets: <a href="${d.app_url}/my-tickets" style="color:#80ffd1;">${d.app_url}/my-tickets</a></p>
      <p style="margin:6px 0 0 0;">Questions? Just reply to this email.</p>
    </td></tr>

  </table>
</div>
</body></html>`;

  // ── Plain-text fallback ──
  const text = [
    `TICKET CONFIRMED`,
    ``,
    `${d.event_title}`,
    d.event_subtitle ? d.event_subtitle : null,
    ``,
    `When:  ${when}`,
    `Where: ${where}`,
    `Ticket: ${d.tier_name} · ${formatINR(d.amount_paise)}`,
    `Name:  ${d.attendee_name} (${d.attendee_email})`,
    ``,
    `Your QR code: ${qrPngUrl}`,
    `Ticket page:  ${ticketUrl}`,
    ``,
    `Organised by ${d.organiser_name} · TechEvent`,
    `Manage tickets: ${d.app_url}/my-tickets`,
    ``,
    `Questions? Reply to this email.`,
  ].filter((l) => l !== null).join("\n");

  return { subject, html, text };
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
