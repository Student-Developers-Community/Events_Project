import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let _transporter: Transporter | null = null;
let _initTried = false;

/**
 * Lazy singleton SMTP transporter. Returns null if SMTP env is missing —
 * callers should fall back to logging.
 */
function getTransporter(): Transporter | null {
  if (_initTried) return _transporter;
  _initTried = true;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: { user, pass },
  });
  return _transporter;
}

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** name -> data (Buffer or base64 string) for inline embedding */
  inline?: Array<{
    filename: string;
    cid: string;
    content: Buffer;
    contentType?: string;
  }>;
  /** File attachments (e.g. .ics calendar invite) */
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
};

export type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; dryrun?: boolean };

/**
 * Compose the From header.
 *   EMAIL_FROM="TechEvent <foo@bar.com>"  → used as-is
 *   EMAIL_FROM="TechEvent"                → "TechEvent <SMTP_USER>"
 *   EMAIL_FROM=missing                    → "TechEvent <SMTP_USER>"
 */
function buildFrom(): string {
  const raw = (process.env.EMAIL_FROM ?? "").trim();
  const user = process.env.SMTP_USER ?? "no-reply@techevent.in";
  if (raw.includes("<") && raw.includes("@")) return raw;        // already formatted
  const name = raw || "TechEvent";
  return `${name} <${user}>`;
}

/**
 * Send via SMTP. If SMTP env is missing, logs and returns dryrun:true so
 * callers can still mark outbox status sensibly.
 */
export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  const t = getTransporter();
  const from = buildFrom();

  if (!t) {
    console.log("[email.dryrun]", { to: payload.to, subject: payload.subject });
    return { ok: false, error: "SMTP not configured", dryrun: true };
  }

  try {
    const info = await t.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      attachments: [
        ...(payload.inline ?? []).map((i) => ({
          filename: i.filename,
          cid: i.cid,
          content: i.content,
          contentType: i.contentType,
        })),
        ...(payload.attachments ?? []).map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      ],
    });
    return { ok: true, messageId: info.messageId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email.send] error:", msg);
    return { ok: false, error: msg };
  }
}
