/**
 * iCalendar (.ics) generation — RFC 5545. Zero dependencies, zero cost.
 * Works with Google Calendar, Apple Calendar, Outlook.
 */

export type CalendarEvent = {
  uid: string;             // stable unique id (use qr_token or registration id)
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;        // ISO
  endsAt: string;          // ISO
  url?: string | null;
  organiserName?: string | null;
};

/** ISO → iCal UTC stamp: 20261214T093000Z */
function toICalUTC(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escape per RFC 5545: backslash, comma, semicolon, newline. */
function esc(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold long lines to 75 octets (RFC 5545 §3.1). Simple char-based fold. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let s = line;
  chunks.push(s.slice(0, 75));
  s = s.slice(75);
  while (s.length > 74) {
    chunks.push(" " + s.slice(0, 74));
    s = s.slice(74);
  }
  if (s.length) chunks.push(" " + s);
  return chunks.join("\r\n");
}

export function generateICS(ev: CalendarEvent): string {
  // DTSTAMP must be a fixed value; derive from start to stay deterministic
  const stamp = toICalUTC(ev.startsAt);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TechEvent//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}@techevent`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toICalUTC(ev.startsAt)}`,
    `DTEND:${toICalUTC(ev.endsAt)}`,
    `SUMMARY:${esc(ev.title)}`,
    ev.description ? `DESCRIPTION:${esc(ev.description)}` : null,
    ev.location ? `LOCATION:${esc(ev.location)}` : null,
    ev.url ? `URL:${esc(ev.url)}` : null,
    ev.organiserName ? `ORGANIZER;CN=${esc(ev.organiserName)}:mailto:noreply@techevent.in` : null,
    // 1-hour-before alarm baked into the calendar entry itself
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(ev.title)} starts in 1 hour`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null);

  return lines.map(fold).join("\r\n");
}
