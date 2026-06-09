-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0006 — event contact details + cover-image storage
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Per-event contact info (shown to attendees on the public event page)
alter table public.events
  add column if not exists contact_email text,
  add column if not exists contact_phone text;

-- 2. Storage bucket for event cover images (public read)
insert into storage.buckets (id, name, public)
values ('event-covers', 'event-covers', true)
on conflict (id) do nothing;

-- 3. Storage policies
--    · anyone can READ (public bucket, used in <img> on public pages)
--    · authenticated users can UPLOAD/UPDATE/DELETE within their own folder
--      (path convention: event-covers/<auth.uid()>/<filename>)

drop policy if exists "event-covers public read"      on storage.objects;
drop policy if exists "event-covers owner insert"     on storage.objects;
drop policy if exists "event-covers owner update"     on storage.objects;
drop policy if exists "event-covers owner delete"     on storage.objects;

create policy "event-covers public read"
  on storage.objects for select
  using ( bucket_id = 'event-covers' );

create policy "event-covers owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "event-covers owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "event-covers owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Expose contact fields on the public view
--    DROP first: CREATE OR REPLACE can't reorder/insert columns, only append.
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
  and e.visibility = 'public';

grant select on public.v_events_public to anon, authenticated;
