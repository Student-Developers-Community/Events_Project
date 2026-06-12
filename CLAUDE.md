# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> ⚠️ **Next.js 16.2.6 + React 19** — this is NOT the Next.js in your training data. APIs, conventions, and file structure differ. Read the relevant guide in `node_modules/next/dist/docs/` before writing routing/server-component code. Note: dynamic route `params` are now a `Promise` (`await ctx.params`).

## Commands

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint (flat config, eslint-config-next)
```

There is no test suite or test runner configured.

## What this is

**TechEvent** — an event-management platform: organisers create events with paid/free ticket tiers, attendees register (no login required), get a QR-coded ticket by email, and organisers scan that QR at the door to check people in. A super-admin must approve each event before it becomes publicly visible. Stack: Next.js App Router + Supabase (Postgres/Auth) + Tailwind v4. Money is INR; payments are designed around Razorpay (schema present, integration is the main unbuilt piece).

## Architecture

### Data layer is Supabase Postgres, and the schema is the source of truth
`supabase/schema.sql` is the canonical, idempotent schema; `supabase/migrations/*.sql` are applied on top (run in the Supabase SQL editor). Read these before touching anything data-related — the DB enforces far more than the app code does:

- **RLS on every table.** Public reads go through `v_events_public` / `v_tiers_public` views that strip soft-deleted, unpublished, unapproved, and private rows. Anon/authenticated clients can only see what these views and policies expose.
- **Triggers do real work**, not just `updated_at`: `handle_new_user()` auto-creates an `organisers` row on signup; `sync_tier_sold_count()` increments/decrements `ticket_tiers.sold_count` as registration `status` changes. Don't reimplement these in app code.
- **Conventions:** soft-delete via `deleted_at`; money as **INR paise (bigint), never floats** (₹499 = `49900`); audit columns `created_by`/`updated_by`.
- Core tables: `organisers` (1:1 with `auth.users`), `events`, `ticket_tiers`, `registrations` (one row per ticket, carries the unguessable `qr_token`), `payments` (Razorpay, 1:1 with a registration), `checkins` (append-only scan audit log), `notifications_outbox`.

### Three Supabase clients — pick the right one (`src/lib/supabase/`)
- `server.ts` → `getSupabaseServerClient()` — RSC / Server Actions / route handlers. Runs **as the logged-in user**, subject to RLS. Default choice.
- `client.ts` — browser client.
- `service.ts` → `getSupabaseServiceClient()` — **service role, BYPASSES RLS, server-only.** Use only for trusted mutations that RLS would block (guest registration confirmation, reading the locked-down `super_admins` table, webhook handlers). All these factories return `null` when env vars are missing — callers handle that gracefully rather than crashing.

### Mutations go through Server Actions, validated with Zod
Business logic lives in `src/lib/<domain>/actions.ts` (`"use server"`) with a matching `schemas.ts` (Zod) per domain: `auth`, `events`, `registrations`, `settings`, `admin`, `checkin`. Pattern: parse `FormData` with the Zod schema → get the user session → enforce rules → mutate → `revalidatePath`/`redirect`. Read helpers are separated into `src/lib/db/*.ts`. UI components in `src/components/<domain>/` wire forms to these actions.

### Auth & authorization (`src/lib/auth/`)
- Session refresh + route protection runs in **`src/proxy.ts`** (this Next version's middleware entrypoint) → `lib/supabase/middleware.ts`. It refreshes tokens on every navigation and redirects unauthenticated users away from `/admin/*` and `/dashboard/*`.
- `session.ts` — `getSessionUser()` / `getCurrentOrganiser()` for RSCs.
- `super-admin.ts` — super-admin is an **email allowlist** in the `super_admins` table, checked via the service client so the table stays invisible. Guard admin pages/actions with `requireSuperAdmin()`.

### Three user surfaces
- `/`, `/events`, `/events/[slug]`, `/events/[slug]/register/*` — **public**: browse and register. Registration is email-based; login optional (links `user_id` if present).
- `/dashboard/*` — **organiser**: create/edit events, manage tiers, view & CSV-export attendees, run the door scanner (`/checkin`).
- `/admin/*` — **super-admin**: approve/reject pending events (god-mode over every event).

### QR check-in flow
Registration generates a unique `qr_token` (base64url random bytes, in the DB default). `src/lib/qr.ts` + `/api/qr/png/[token]` render the ticket QR. At the door, the organiser scanner (`components/dashboard/QrScanner.tsx`, html5-qrcode) calls a **check-in Server Action** — the mutation never happens via the public `/api/qr/verify/[token]` endpoint (that's just an info page for people who scan with their phone camera). Every scan, success or failure, is logged to `checkins`.

### Notifications: outbox pattern + cron
On registration confirmation, `lib/notifications/dispatch.ts` `enqueue()`s rows into `notifications_outbox` — the confirmation email plus future reminders (24h and 1h before the event). A **free external cron** hits `GET /api/cron/dispatch` (bearer-authed with `CRON_SECRET`, fails closed) which calls `processDueNotifications()` to send everything now due. Email is SMTP via nodemailer (`email-sender.ts`); templates in `lib/notifications/templates/`. `.ics` calendar invites are generated in `lib/calendar.ts` and served at `/api/calendar/[token]`. See `docs/reminders-and-cron.md` for wiring the cron.

## Environment

Required for full function (clients no-op without them, so the app boots without):
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY   # public Supabase
SUPABASE_SERVICE_ROLE_KEY                                  # service-role (server only)
NEXT_PUBLIC_APP_URL                                        # absolute links in emails/QR
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM # nodemailer
CRON_SECRET                                                # /api/cron/dispatch bearer (dev: dev-cron-secret-change-me)
```

Google OAuth login setup: `docs/google-login-setup.md`. Full product spec: `docs/TechEventsPlatform_Documentation.pdf`.
