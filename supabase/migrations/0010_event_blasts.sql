-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0010 — event blasts (announcements)
--
-- Organisers post announcements ("blasts") on an event. They're shown in the
-- event's Blasts section (public event page + organiser dashboard) — no email.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.event_blasts (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  message     text not null,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create index if not exists idx_blasts_event on public.event_blasts (event_id, created_at desc);

alter table public.event_blasts enable row level security;

-- Anyone can read blasts for a publicly-visible event.
drop policy if exists "blasts public read" on public.event_blasts;
create policy "blasts public read"
  on public.event_blasts for select
  using (
    exists (select 1 from public.events e
            where e.id = event_blasts.event_id
              and e.deleted_at is null
              and e.status = 'published'
              and e.visibility = 'public'
              and e.approval_status = 'approved')
  );

-- Organiser manages blasts for events they own.
drop policy if exists "blasts organiser all" on public.event_blasts;
create policy "blasts organiser all"
  on public.event_blasts for all
  using (
    exists (select 1 from public.events e
            where e.id = event_blasts.event_id and e.organiser_id = auth.uid())
  )
  with check (
    exists (select 1 from public.events e
            where e.id = event_blasts.event_id and e.organiser_id = auth.uid())
  );
