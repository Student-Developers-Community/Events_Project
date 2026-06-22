-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0011 — hackathon mode (teams + college eligibility)
--
-- A hackathon event has a fixed team size and either open eligibility or a set
-- of allowed colleges, each with a team quota. Registration is by the team
-- lead; every member becomes a registration (own QR ticket).
-- ────────────────────────────────────────────────────────────────────────────

alter table public.events
  add column if not exists is_hackathon     boolean not null default false,
  add column if not exists team_size        int check (team_size is null or (team_size between 1 and 20)),
  add column if not exists eligibility_mode text not null default 'open'
    check (eligibility_mode in ('open','colleges')),
  -- entry fee per TEAM in INR paise (0 = free). Set by the admin at creation.
  add column if not exists entry_fee_paise  bigint not null default 0 check (entry_fee_paise >= 0),
  -- "Others" bucket: teams from colleges not in the list, with their own quota.
  add column if not exists allow_others      boolean not null default false,
  add column if not exists others_quota      int check (others_quota is null or others_quota > 0);

-- Hackathon team members register without a ticket tier — make tier optional.
alter table public.registrations alter column tier_id drop not null;

-- Allowed colleges + per-college TEAM quota (only used when eligibility='colleges')
create table if not exists public.event_colleges (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  name        text not null,
  team_quota  int not null check (team_quota > 0),
  created_at  timestamptz not null default now()
);
create index if not exists idx_event_colleges_event on public.event_colleges (event_id);
create unique index if not exists uq_event_colleges_name on public.event_colleges (event_id, lower(name));

-- Teams. member_count is denormalised for quick display.
create table if not exists public.event_teams (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  name         text not null,
  college      text,
  lead_name    text not null,
  lead_email   text not null,
  lead_phone   text,
  member_count int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists idx_event_teams_event on public.event_teams (event_id);
create index if not exists idx_event_teams_college on public.event_teams (event_id, lower(college));
create unique index if not exists uq_event_teams_name on public.event_teams (event_id, lower(name));

-- Link each member registration to its team.
alter table public.registrations
  add column if not exists team_id      uuid references public.event_teams(id) on delete set null,
  add column if not exists is_team_lead boolean not null default false;
create index if not exists idx_regs_team on public.registrations (team_id) where team_id is not null;

-- ── RLS ──
alter table public.event_colleges enable row level security;
alter table public.event_teams    enable row level security;

-- Colleges: public read for visible events (registration dropdown); organiser manages.
drop policy if exists "colleges public read" on public.event_colleges;
create policy "colleges public read"
  on public.event_colleges for select
  using (exists (select 1 from public.events e
                 where e.id = event_colleges.event_id and e.deleted_at is null
                   and e.status='published' and e.visibility='public' and e.approval_status='approved'));

drop policy if exists "colleges organiser all" on public.event_colleges;
create policy "colleges organiser all"
  on public.event_colleges for all
  using (exists (select 1 from public.events e where e.id = event_colleges.event_id and e.organiser_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_colleges.event_id and e.organiser_id = auth.uid()));

-- Teams: organiser reads their event's teams. Writes happen via service role.
drop policy if exists "teams organiser read" on public.event_teams;
create policy "teams organiser read"
  on public.event_teams for select
  using (exists (select 1 from public.events e where e.id = event_teams.event_id and e.organiser_id = auth.uid()));

-- ── Expose hackathon fields on the public view ──
drop view if exists public.v_events_public;
create view public.v_events_public as
select
  e.id, e.slug, e.title, e.subtitle, e.description, e.cover_image_url,
  e.category, e.starts_at, e.ends_at, e.timezone,
  e.is_online, e.venue_name, e.city, e.total_capacity,
  e.contact_email, e.contact_phone,
  e.questions,
  e.is_hackathon, e.team_size, e.eligibility_mode, e.entry_fee_paise,
  e.allow_others, e.others_quota,
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
