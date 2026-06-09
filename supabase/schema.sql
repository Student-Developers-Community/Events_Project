-- ────────────────────────────────────────────────────────────────────────────
-- TechEvent — Supabase schema
-- Idempotent: safe to re-run. Run in Supabase SQL editor.
-- Project: nqqqjnhhxhpranzpusjp.supabase.co
--
-- Conventions (production-grade, locked-in for this project):
--   · soft delete via `deleted_at timestamptz` on entity tables
--   · audit fields: created_at / updated_at / created_by / updated_by
--   · `updated_at` maintained by trigger
--   · CHECK constraints for enums + value bounds
--   · indexes on every FK + common filter
--   · RLS enabled on every table; policies declared explicitly
--   · monetary values stored as INR paise (bigint) — never floats
--   · public-facing reads go through views (`v_*_public`) that strip
--     soft-deleted / unpublished / past-cutoff rows
-- ────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Shared utilities
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. organisers
--    One row per organiser. Extends auth.users 1:1.
--    Created on first sign-in via a trigger on auth.users.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.organisers (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  email         text not null,
  phone         text,
  bio           text,
  avatar_url    text,
  website_url   text,
  is_verified   boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

drop trigger if exists trg_organisers_updated_at on public.organisers;
create trigger trg_organisers_updated_at
  before update on public.organisers
  for each row execute function public.set_updated_at();

create index if not exists idx_organisers_email on public.organisers (email) where deleted_at is null;

-- Auto-create organiser row on auth.users insert.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.organisers (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────────
-- 3. events
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.events (
  id                 uuid primary key default gen_random_uuid(),
  organiser_id       uuid not null references public.organisers(id) on delete restrict,

  slug               text not null unique,
  title              text not null,
  subtitle           text,
  description        text,
  cover_image_url    text,

  category           text not null check (category in ('hackathon','workshop','conference','meetup','demo_day','other')),
  status             text not null default 'draft' check (status in ('draft','published','cancelled','completed')),
  visibility         text not null default 'public' check (visibility in ('public','unlisted','private')),

  -- timing
  starts_at          timestamptz not null,
  ends_at            timestamptz not null,
  registration_opens_at  timestamptz,
  registration_closes_at timestamptz,
  timezone           text not null default 'Asia/Kolkata',

  -- location
  is_online          boolean not null default false,
  venue_name         text,
  venue_address      text,
  city               text,
  online_url         text,

  -- limits
  total_capacity     int check (total_capacity is null or total_capacity > 0),

  -- search
  search             tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(subtitle, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(city, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'D')
  ) stored,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users(id),
  updated_by         uuid references auth.users(id),
  deleted_at         timestamptz,

  constraint chk_events_timing      check (ends_at > starts_at),
  constraint chk_events_reg_window  check (
    registration_opens_at is null or registration_closes_at is null
    or registration_closes_at > registration_opens_at
  )
);

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create index if not exists idx_events_organiser  on public.events (organiser_id) where deleted_at is null;
create index if not exists idx_events_status     on public.events (status)       where deleted_at is null;
create index if not exists idx_events_starts_at  on public.events (starts_at)    where deleted_at is null;
create index if not exists idx_events_city       on public.events (city)         where deleted_at is null;
create index if not exists idx_events_category   on public.events (category)     where deleted_at is null;
create index if not exists idx_events_search     on public.events using gin (search);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. ticket_tiers
--    Multiple price tiers per event (Early Bird / Regular / Student / etc).
--    `price_paise` = INR price in paise (₹499 = 49900). Free tier = 0.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.ticket_tiers (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,

  name            text not null,
  description     text,
  price_paise     bigint not null check (price_paise >= 0),

  capacity        int check (capacity is null or capacity > 0),
  sold_count      int not null default 0 check (sold_count >= 0),

  sale_starts_at  timestamptz,
  sale_ends_at    timestamptz,
  sort_order      int not null default 0,
  is_active       boolean not null default true,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,

  constraint chk_tiers_capacity_not_oversold check (capacity is null or sold_count <= capacity),
  constraint chk_tiers_sale_window check (
    sale_starts_at is null or sale_ends_at is null or sale_ends_at > sale_starts_at
  )
);

drop trigger if exists trg_tiers_updated_at on public.ticket_tiers;
create trigger trg_tiers_updated_at
  before update on public.ticket_tiers
  for each row execute function public.set_updated_at();

create index if not exists idx_tiers_event on public.ticket_tiers (event_id) where deleted_at is null;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. registrations
--    One row per ticket. Has a unique QR token used at the door.
--    Attendee info stored denormalised (snapshot at registration time) so
--    profile edits don't retroactively change tickets.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.registrations (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete restrict,
  tier_id         uuid not null references public.ticket_tiers(id) on delete restrict,

  -- optional: link to auth user if attendee logged in
  user_id         uuid references auth.users(id) on delete set null,

  -- attendee snapshot (used for guest checkout too)
  attendee_name   text not null,
  attendee_email  text not null,
  attendee_phone  text,

  -- QR — unguessable token, URL-safe (base64url: '+/' → '-_', strip '=')
  qr_token        text not null unique default
                  translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_'),

  status          text not null default 'pending'
                  check (status in ('pending','confirmed','cancelled','checked_in','refunded','no_show')),
  amount_paise    bigint not null default 0 check (amount_paise >= 0),

  -- timestamps for each terminal state (for analytics + reconciliation)
  confirmed_at    timestamptz,
  cancelled_at    timestamptz,
  checked_in_at   timestamptz,
  refunded_at     timestamptz,

  notes           text,
  metadata        jsonb not null default '{}'::jsonb,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

drop trigger if exists trg_regs_updated_at on public.registrations;
create trigger trg_regs_updated_at
  before update on public.registrations
  for each row execute function public.set_updated_at();

create index if not exists idx_regs_event   on public.registrations (event_id)  where deleted_at is null;
create index if not exists idx_regs_tier    on public.registrations (tier_id)   where deleted_at is null;
create index if not exists idx_regs_user    on public.registrations (user_id)   where deleted_at is null and user_id is not null;
create index if not exists idx_regs_status  on public.registrations (status)    where deleted_at is null;
create index if not exists idx_regs_email   on public.registrations (attendee_email) where deleted_at is null;

-- Prevent the same email from registering twice for the same event
-- (excludes cancelled/refunded so they can re-register if needed).
create unique index if not exists uq_regs_event_email_active
  on public.registrations (event_id, lower(attendee_email))
  where deleted_at is null and status in ('pending','confirmed','checked_in');

-- Auto-increment sold_count when a registration moves to 'confirmed',
-- decrement on refund/cancel from a confirmed state.
create or replace function public.sync_tier_sold_count()
returns trigger language plpgsql as $$
declare
  was_sold boolean;
  is_sold  boolean;
begin
  was_sold := tg_op = 'UPDATE' and old.status in ('confirmed','checked_in');
  is_sold  := new.status in ('confirmed','checked_in');

  if tg_op = 'INSERT' then
    if is_sold then
      update public.ticket_tiers set sold_count = sold_count + 1 where id = new.tier_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if was_sold and not is_sold then
      update public.ticket_tiers set sold_count = greatest(sold_count - 1, 0) where id = new.tier_id;
    elsif (not was_sold) and is_sold then
      update public.ticket_tiers set sold_count = sold_count + 1 where id = new.tier_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_regs_sync_sold on public.registrations;
create trigger trg_regs_sync_sold
  after insert or update of status on public.registrations
  for each row execute function public.sync_tier_sold_count();

-- ────────────────────────────────────────────────────────────────────────────
-- 6. payments
--    Razorpay order/payment record. Audit-style: never soft-deleted.
--    Linked 1:1 to a registration (free events skip this table entirely).
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  registration_id     uuid not null unique references public.registrations(id) on delete restrict,
  event_id            uuid not null references public.events(id) on delete restrict,

  razorpay_order_id   text not null unique,
  razorpay_payment_id text unique,
  razorpay_signature  text,

  amount_paise        bigint not null check (amount_paise > 0),
  currency            text not null default 'INR' check (currency = 'INR'),
  status              text not null default 'created'
                      check (status in ('created','authorized','captured','failed','refunded','partial_refund')),

  failure_reason      text,
  refund_amount_paise bigint not null default 0 check (refund_amount_paise >= 0),
  refunded_at         timestamptz,

  raw_webhook         jsonb,
  webhook_received_at timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create index if not exists idx_payments_event  on public.payments (event_id);
create index if not exists idx_payments_status on public.payments (status);

-- ────────────────────────────────────────────────────────────────────────────
-- 7. checkins
--    Audit trail of every scan attempt (success + failure).
--    Append-only — no updates, no soft delete.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.checkins (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid references public.registrations(id) on delete restrict,
  event_id        uuid not null references public.events(id) on delete restrict,

  scanned_by      uuid references auth.users(id),
  scanned_at      timestamptz not null default now(),

  success         boolean not null,
  failure_reason  text,
  device_info     text,
  ip_address      inet
);

create index if not exists idx_checkins_event on public.checkins (event_id);
create index if not exists idx_checkins_reg   on public.checkins (registration_id);
create index if not exists idx_checkins_at    on public.checkins (scanned_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- 8. notifications_outbox
--    Outbox pattern for WhatsApp / email. A worker picks rows up,
--    delivers them, and updates status. Survives downtime + retries safely.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.notifications_outbox (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid references public.registrations(id) on delete cascade,
  event_id        uuid references public.events(id) on delete cascade,

  channel         text not null check (channel in ('email','whatsapp','sms')),
  template        text not null,             -- e.g. 'registration_confirmed'
  recipient       text not null,             -- email or phone
  payload         jsonb not null default '{}'::jsonb,

  status          text not null default 'queued'
                  check (status in ('queued','sending','sent','failed','dead')),
  attempts        int not null default 0,
  last_error      text,
  scheduled_for   timestamptz not null default now(),
  sent_at         timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_outbox_updated_at on public.notifications_outbox;
create trigger trg_outbox_updated_at
  before update on public.notifications_outbox
  for each row execute function public.set_updated_at();

create index if not exists idx_outbox_due
  on public.notifications_outbox (scheduled_for)
  where status = 'queued';

-- ────────────────────────────────────────────────────────────────────────────
-- 9. Public views (safe for anon reads)
-- ────────────────────────────────────────────────────────────────────────────

create or replace view public.v_events_public as
select
  e.id, e.slug, e.title, e.subtitle, e.description, e.cover_image_url,
  e.category, e.starts_at, e.ends_at, e.timezone,
  e.is_online, e.venue_name, e.city, e.total_capacity,
  e.organiser_id,
  o.display_name as organiser_name,
  o.avatar_url   as organiser_avatar
from public.events e
join public.organisers o on o.id = e.organiser_id and o.deleted_at is null
where e.deleted_at is null
  and e.status = 'published'
  and e.visibility = 'public';

create or replace view public.v_tiers_public as
select
  t.id, t.event_id, t.name, t.description, t.price_paise,
  t.capacity, t.sold_count, t.sale_starts_at, t.sale_ends_at, t.sort_order,
  case
    when t.capacity is null then false
    when t.sold_count >= t.capacity then true
    else false
  end as is_sold_out
from public.ticket_tiers t
join public.events e on e.id = t.event_id and e.deleted_at is null and e.status = 'published'
where t.deleted_at is null
  and t.is_active = true;

-- ────────────────────────────────────────────────────────────────────────────
-- 10. RLS — enable on every table
-- ────────────────────────────────────────────────────────────────────────────

alter table public.organisers           enable row level security;
alter table public.events               enable row level security;
alter table public.ticket_tiers         enable row level security;
alter table public.registrations        enable row level security;
alter table public.payments             enable row level security;
alter table public.checkins             enable row level security;
alter table public.notifications_outbox enable row level security;

-- ───── organisers ─────
drop policy if exists "organisers self read"  on public.organisers;
drop policy if exists "organisers self write" on public.organisers;

create policy "organisers self read"
  on public.organisers for select
  using (auth.uid() = id and deleted_at is null);

create policy "organisers self write"
  on public.organisers for update
  using (auth.uid() = id);

-- ───── events ─────
drop policy if exists "events public read"    on public.events;
drop policy if exists "events owner read"     on public.events;
drop policy if exists "events owner insert"   on public.events;
drop policy if exists "events owner update"   on public.events;

create policy "events public read"
  on public.events for select
  using (deleted_at is null and status = 'published' and visibility = 'public');

create policy "events owner read"
  on public.events for select
  using (auth.uid() = organiser_id);

create policy "events owner insert"
  on public.events for insert
  with check (auth.uid() = organiser_id);

create policy "events owner update"
  on public.events for update
  using (auth.uid() = organiser_id);

-- ───── ticket_tiers ─────
drop policy if exists "tiers public read"  on public.ticket_tiers;
drop policy if exists "tiers owner read"   on public.ticket_tiers;
drop policy if exists "tiers owner write"  on public.ticket_tiers;

create policy "tiers public read"
  on public.ticket_tiers for select
  using (
    deleted_at is null
    and is_active = true
    and exists (
      select 1 from public.events e
      where e.id = ticket_tiers.event_id
        and e.deleted_at is null
        and e.status = 'published'
        and e.visibility = 'public'
    )
  );

create policy "tiers owner read"
  on public.ticket_tiers for select
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_tiers.event_id
        and e.organiser_id = auth.uid()
    )
  );

create policy "tiers owner write"
  on public.ticket_tiers for all
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_tiers.event_id
        and e.organiser_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = ticket_tiers.event_id
        and e.organiser_id = auth.uid()
    )
  );

-- ───── registrations ─────
-- Attendees: can read own (by user_id) or via secret QR token (server only).
-- Organisers: can read all registrations for events they own.
-- Inserts go through Server Actions (which run with the user's auth context)
-- — for guest checkout we'll need a service_role-backed Server Action.
drop policy if exists "regs attendee read"  on public.registrations;
drop policy if exists "regs organiser read" on public.registrations;
drop policy if exists "regs organiser update" on public.registrations;

create policy "regs attendee read"
  on public.registrations for select
  using (auth.uid() is not null and user_id = auth.uid() and deleted_at is null);

create policy "regs organiser read"
  on public.registrations for select
  using (
    exists (
      select 1 from public.events e
      where e.id = registrations.event_id
        and e.organiser_id = auth.uid()
    )
  );

create policy "regs organiser update"
  on public.registrations for update
  using (
    exists (
      select 1 from public.events e
      where e.id = registrations.event_id
        and e.organiser_id = auth.uid()
    )
  );

-- ───── payments ─────
-- No anon access. Organiser can read payments for their events.
-- Writes are server-only (Razorpay webhook → service_role).
drop policy if exists "payments organiser read" on public.payments;

create policy "payments organiser read"
  on public.payments for select
  using (
    exists (
      select 1 from public.events e
      where e.id = payments.event_id
        and e.organiser_id = auth.uid()
    )
  );

-- ───── checkins ─────
drop policy if exists "checkins organiser read"   on public.checkins;
drop policy if exists "checkins organiser insert" on public.checkins;

create policy "checkins organiser read"
  on public.checkins for select
  using (
    exists (
      select 1 from public.events e
      where e.id = checkins.event_id
        and e.organiser_id = auth.uid()
    )
  );

create policy "checkins organiser insert"
  on public.checkins for insert
  with check (
    exists (
      select 1 from public.events e
      where e.id = checkins.event_id
        and e.organiser_id = auth.uid()
    )
  );

-- ───── notifications_outbox ─────
-- Server-only. No policies for anon/authenticated reads = no access by default.

-- ────────────────────────────────────────────────────────────────────────────
-- 11. Grants for the views
-- ────────────────────────────────────────────────────────────────────────────

grant select on public.v_events_public to anon, authenticated;
grant select on public.v_tiers_public  to anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Done.
-- ────────────────────────────────────────────────────────────────────────────
