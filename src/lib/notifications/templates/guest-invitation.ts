import { formatEventDate } from "@/lib/format";

export type GuestInvitationCtx = {
  guest_name: string | null;
  event_title: string;
  event_subtitle: string | null;
  event_starts_at: string;
  event_timezone: string;
  event_is_online: boolean;
  event_venue_name: string | null;
  event_city: string | null;
  organiser_name: string;
  invite_url: string;
};

/** Email a guest receives when invited. Subject + HTML + plaintext. */
export function renderGuestInvitation(c: GuestInvitationCtx): { subject: string; html: string; text: string } {
  const when = formatEventDate(c.event_starts_at, c.event_timezone);
  const where = c.event_is_online ? "Online" : [c.event_venue_name, c.event_city].filter(Boolean).join(", ") || "TBA";
  const hi = c.guest_name ? `Hi ${c.guest_name},` : "Hi,";

  const subject = `You're invited: ${c.event_title}`;

  const html = `
  <div style="font-family:Helvetica,Arial,sans-serif;background:#000;color:#fff;padding:32px;border-radius:14px;max-width:520px;margin:auto">
    <p style="color:#b9a7ff;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px">You're invited</p>
    <h1 style="font-size:24px;margin:0 0 6px">${escapeHtml(c.event_title)}</h1>
    ${c.event_subtitle ? `<p style="color:#9a9ab4;margin:0 0 16px">${escapeHtml(c.event_subtitle)}</p>` : ""}
    <p style="color:#cfcfe0;margin:0 0 4px"><b>When:</b> ${escapeHtml(when)}</p>
    <p style="color:#cfcfe0;margin:0 0 20px"><b>Where:</b> ${escapeHtml(where)}</p>
    <p style="color:#cfcfe0;margin:0 0 24px">${hi} ${escapeHtml(c.organiser_name)} has invited you to this event. Tap below to view the details and respond.</p>
    <a href="${c.invite_url}" style="display:inline-block;background:linear-gradient(135deg,#7c5cff,#00d4ff);color:#001a10;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:8px">View invitation →</a>
    <p style="color:#6a6a84;font-size:12px;margin:24px 0 0">Or paste this link: ${c.invite_url}</p>
  </div>`;

  const text = `${hi}\n\n${c.organiser_name} has invited you to "${c.event_title}".\nWhen: ${when}\nWhere: ${where}\n\nView & respond: ${c.invite_url}`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
