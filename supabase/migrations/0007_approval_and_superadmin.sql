-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0007 — event approval workflow + super admin
--
-- · Events now require super-admin APPROVAL before they're publicly visible.
-- · super_admins = email allowlist of platform owners.
-- · Public view requires status='published' AND approval_status='approved'.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Approval columns on events
alter table public.events
  add column if not exists approval_status text not null default 'pending'
    check (approval_status in ('pending','approved','rejected')),
  add column if not exists approved_at      timestamptz,
  add column if not exists approved_by      uuid references auth.users(id),
  add column if not exists rejection_reason text;

-- Existing published events keep working — grandfather them in as approved.
update public.events
  set approval_status = 'approved', approved_at = coalesce(approved_at, now())
  where status = 'published' and approval_status = 'pending';

create index if not exists idx_events_approval
  on public.events (approval_status) where deleted_at is null;

-- 2. Super-admin allowlist
create table if not exists public.super_admins (
  email      text primary key,   -- always stored lowercase; lookups use lower()
  created_at timestamptz not null default now()
);
comment on table public.super_admins is 'Platform owners with god-mode access to every event.';

-- Seed the founder. Change/add more rows as needed.
insert into public.super_admins (email)
values ('goutipavankumar1249@gmail.com')
on conflict (email) do nothing;

-- Lock the table: RLS on, no policies → only service-role (server) can read it.
alter table public.super_admins enable row level security;

-- 3. is_super_admin() — checks the JWT email against the allowlist.
create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.super_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 4. Public read must now also require approval.
drop policy if exists "events public read" on public.events;
create policy "events public read"
  on public.events for select
  using (
    deleted_at is null
    and status = 'published'
    and visibility = 'public'
    and approval_status = 'approved'
  );

-- 5. Public view — require approval too. DROP+CREATE (can't reorder columns).
drop view if exists public.v_events_public;
create view public.v_events_public as
select
  e.id, e.slug, e.title, e.subtitle, e.description, e.cover_image_url,
  e.category, e.starts_at, e.ends_at, e.timezone,
  e.is_online, e.venue_name, e.city, e.total_capacity,
  e.contact_email, e.contact_phone,
  e.organiser_id,
  o.display_name as organiser_name,
  o.avatar_url   as organiser_avatar
from public.events e
join public.organisers o on o.id = e.organiser_id and o.deleted_at is null
where e.deleted_at is null
  and e.status = 'published'
  and e.visibility = 'public'
  and e.approval_status = 'approved';

grant select on public.v_events_public to anon, authenticated;

-- v_tiers_public references events.status='published'; tighten to approved too.
drop view if exists public.v_tiers_public;
create view public.v_tiers_public as
select
  t.id, t.event_id, t.name, t.description, t.price_paise,
  t.capacity, t.sold_count, t.sale_starts_at, t.sale_ends_at, t.sort_order,
  case when t.capacity is null then false
       when t.sold_count >= t.capacity then true else false end as is_sold_out
from public.ticket_tiers t
join public.events e on e.id = t.event_id
  and e.deleted_at is null and e.status = 'published' and e.approval_status = 'approved'
where t.deleted_at is null and t.is_active = true;

grant select on public.v_tiers_public to anon, authenticated;
