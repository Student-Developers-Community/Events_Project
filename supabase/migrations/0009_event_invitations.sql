-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0009 — guest invitations
--
-- Organisers invite guests by email. Each invite has a secret token; the guest
-- opens /invite/<token>, sees the event, and Accepts or Declines. On accept we
-- create a complimentary (₹0) confirmed registration so they get a QR ticket
-- through the existing ticket flow.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.event_invitations (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,

  email           text not null,
  name            text,

  -- secret link token (base64url, like registrations.qr_token)
  token           text not null unique default
                  translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_'),

  status          text not null default 'invited'
                  check (status in ('invited','accepted','declined')),

  -- set once the guest accepts and a comp registration is created
  registration_id uuid references public.registrations(id) on delete set null,

  invited_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  responded_at    timestamptz
);

-- one invite per email per event
create unique index if not exists uq_invitations_event_email
  on public.event_invitations (event_id, lower(email));
create index if not exists idx_invitations_event on public.event_invitations (event_id);
create index if not exists idx_invitations_status on public.event_invitations (status);

alter table public.event_invitations enable row level security;

-- Organiser manages invitations for events they own.
-- (Guest accept/decline + token reads happen server-side via service_role,
--  which bypasses RLS.)
drop policy if exists "invitations organiser all" on public.event_invitations;
create policy "invitations organiser all"
  on public.event_invitations for all
  using (
    exists (select 1 from public.events e
            where e.id = event_invitations.event_id and e.organiser_id = auth.uid())
  )
  with check (
    exists (select 1 from public.events e
            where e.id = event_invitations.event_id and e.organiser_id = auth.uid())
  );
