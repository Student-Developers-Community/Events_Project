# Calendar invites + auto-reminders

Both features are **free** — no paid services.

## What's built

| Feature | How it works |
|---|---|
| **.ics calendar invite** | Generated server-side (`src/lib/calendar.ts`). Attached to the confirmation email + downloadable via "📅 Add to calendar" on the success page (`/api/calendar/[token]`). Includes a built-in 1-hour-before alarm. Works with Google / Apple / Outlook. |
| **Auto-reminders** | On confirmation we queue two future emails in `notifications_outbox`: one 24h before the event, one 1h before. A cron pings `/api/cron/dispatch` which sends everything that's now due. |

## Wiring the cron (required for reminders to actually fire)

The reminder *engine* is built. It only needs something to call `/api/cron/dispatch` on a schedule.

### Endpoint
```
GET /api/cron/dispatch
Authorization: Bearer <CRON_SECRET>
```
Returns `{ ok, sent, failed }`. Without the bearer token it returns 401.

### Option A — cron-job.org (free, recommended, hourly)
1. Sign up at https://cron-job.org (free)
2. Create a cron job:
   - URL: `https://<your-domain>/api/cron/dispatch`
   - Schedule: every 1 hour (or every 15 min for tighter "1h before" accuracy)
   - Add header: `Authorization: Bearer <your CRON_SECRET>`
3. Save. Done.

### Option B — Vercel Cron (free on Hobby, but daily only)
Add `vercel.json`:
```json
{ "crons": [{ "path": "/api/cron/dispatch", "schedule": "0 * * * *" }] }
```
Note: Vercel **Hobby** runs crons once/day max. Good enough for the 24h reminder, too coarse for the 1h one. Use Option A for hourly.

### Option C — Supabase pg_cron (free, runs in the DB)
Schedule a SQL job that calls the endpoint via `pg_net`. More setup; only worth it if you want zero external dependencies.

## Env

```
CRON_SECRET=<any random string>
```
Set the same value in your cron service's Authorization header. In dev it's `dev-cron-secret-change-me`.

## Notes
- Reminders are only queued for times still in the future at confirmation. Registering for an event starting in 30 min → no 24h reminder, but a 1h reminder won't queue either (already past) — they just get the confirmation.
- Each outbox row is sent once then marked `sent` — no duplicates even if the cron runs often.
- If SMTP isn't configured, due rows stay `queued` (safe to retry later).
