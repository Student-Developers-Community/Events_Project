-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0008 — custom registration questions per event
--
-- Organisers can ask attendees extra questions at registration time
-- (e.g. LinkedIn URL, T-shirt size, GitHub handle). Stored as an ordered
-- JSON array on the event; answers are stored on registrations.metadata.answers.
--
-- Question shape (validated in app code, see src/lib/events/schemas.ts):
--   { "id": "q1", "label": "LinkedIn URL", "type": "url", "required": true }
--   type ∈ ('text','textarea','url','email','phone')
-- ────────────────────────────────────────────────────────────────────────────

alter table public.events
  add column if not exists questions jsonb not null default '[]'::jsonb;

-- Guard: questions must always be a JSON array (cheap DB-level invariant so app
-- code never has to defend against a stray object/string). Idempotent.
alter table public.events drop constraint if exists chk_events_questions_is_array;
alter table public.events
  add constraint chk_events_questions_is_array check (jsonb_typeof(questions) = 'array');

-- Expose questions on the public view so the registration page can render them.
-- DROP first: CREATE OR REPLACE can't append/reorder columns mid-list.
drop view if exists public.v_events_public;
create view public.v_events_public as
select
  e.id, e.slug, e.title, e.subtitle, e.description, e.cover_image_url,
  e.category, e.starts_at, e.ends_at, e.timezone,
  e.is_online, e.venue_name, e.city, e.total_capacity,
  e.contact_email, e.contact_phone,
  e.questions,
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
