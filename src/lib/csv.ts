/**
 * Tiny CSV serialiser. RFC-4180-ish: quotes when needed, escapes inner quotes,
 * uses CRLF (Excel-friendly). No dependency.
 */

export function toCsv(rows: Array<Record<string, unknown>>, headers: string[]): string {
  const headerLine = headers.map(escape).join(",");
  const body = rows
    .map((row) => headers.map((h) => escape(row[h])).join(","))
    .join("\r\n");
  return `${headerLine}\r\n${body}`;
}

function escape(value: unknown): string {
  if (value == null) return "";
  let s: string;
  if (value instanceof Date) {
    s = value.toISOString();
  } else if (typeof value === "object") {
    s = JSON.stringify(value);
  } else {
    s = String(value);
  }
  const needsQuoting = /[",\r\n]/.test(s);
  if (needsQuoting) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}
