-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0001 — registration policies
-- Adds the INSERT policy missing in schema.sql so attendees can register
-- (status forced to 'pending'; confirmation happens server-side via
--  service_role once payment lands — or via the dev "Skip & Get QR" button).
-- ────────────────────────────────────────────────────────────────────────────

drop policy if exists "regs public insert" on public.registrations;

create policy "regs public insert"
  on public.registrations for insert
  with check (
    status = 'pending'
    and exists (
      select 1 from public.events e
      where e.id = registrations.event_id
        and e.deleted_at is null
        and e.status = 'published'
        and e.visibility = 'public'
    )
    and exists (
      select 1 from public.ticket_tiers t
      where t.id = registrations.tier_id
        and t.event_id = registrations.event_id
        and t.deleted_at is null
        and t.is_active = true
    )
  );
