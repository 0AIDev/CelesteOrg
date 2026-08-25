-- 0005: timezone on calendar events (remote teams)
alter table public.calendar_events
  add column if not exists timezone text;

-- Keep existing rows valid with the project's default tz.
update public.calendar_events
  set timezone = 'UTC'
  where timezone is null;
