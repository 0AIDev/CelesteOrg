-- ============================================================================
-- CELESTE HQ — NOTIFICATIONS
-- Real, per-user notifications (approvals, ideas, invites, reports).
-- Server writes rows via the admin client; users read/mark-read their own.
-- Idempotent: safe to run more than once.
-- ============================================================================

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type         text not null default 'system'
               check (type in ('approval','idea','invite','report','system')),
  title        text not null,
  body         text,
  target_id    uuid,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_notifications_recipient on public.notifications(recipient_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(recipient_id) where read_at is null;

alter table public.notifications enable row level security;

-- Users read only their own notifications.
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (recipient_id = public.current_user_id());

-- Users may mark their own notifications as read (nothing else).
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (recipient_id = public.current_user_id())
  with check (recipient_id = public.current_user_id());

-- No user insert/delete: rows are written server-side via the admin client.

-- Realtime: let the header bell live-update without polling.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
