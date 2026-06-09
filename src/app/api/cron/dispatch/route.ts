import { NextResponse } from "next/server";
import { processDueNotifications } from "@/lib/notifications/dispatch";

/**
 * GET /api/cron/dispatch — delivers all due notifications (reminders, etc).
 * Call this on a schedule from a free cron (cron-job.org, Vercel Cron, etc).
 *
 * Auth: requires a bearer token matching CRON_SECRET, OR Vercel's cron
 * header. Without a configured secret it refuses to run (fail closed).
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const tokenOk = auth === `Bearer ${secret}`;

  if (!tokenOk && !isVercelCron) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueNotifications();
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
}
