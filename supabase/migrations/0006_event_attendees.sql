-- 0006: tag attendees on calendar events (many-to-many)
-- Lets the creator tag one or more team members on an event ("Tag people").
create table if not exists public.event_attendees (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.calendar_events(id) on delete cascade,
  attendee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, attendee_id)
);

create index if not exists idx_event_attendees_event on public.event_attendees(event_id);
create index if not exists idx_event_attendees_person on public.event_attendees(attendee_id);

alter table public.event_attendees enable row level security;

-- Everyone on the team can see who's tagged (shared calendar).
create policy "event_attendees_select"
  on public.event_attendees for select to authenticated using (true);

-- Only the event creator (or admin) can tag attendees.
create policy "event_attendees_insert"
  on public.event_attendees for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.calendar_events e
      where e.id = event_id and e.user_id = public.current_user_id()
    )
  );

-- And only the creator (or admin) can remove tags.
create policy "event_attendees_update"
  on public.event_attendees for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.calendar_events e
      where e.id = event_id and e.user_id = public.current_user_id()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.calendar_events e
      where e.id = event_id and e.user_id = public.current_user_id()
    )
  );

-- Owner can remove attendees directly (delete).
create policy "event_attendees_delete"
  on public.event_attendees for delete to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.calendar_events e
      where e.id = event_id and e.user_id = public.current_user_id()
    )
  );