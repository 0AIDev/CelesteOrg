-- ============================================================================
-- CELESTE HQ — 0012: User permissions (Discord-style feature matrix)
-- One row per (user, feature). Absence of a row = allowed by default, so the
-- matrix only ever *restricts*; the CEO (founder/admin) flips rows in realtime.
-- ============================================================================

create table if not exists public.user_permissions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  feature    text not null,
  allowed    boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  unique (user_id, feature)
);

create index if not exists idx_user_permissions_user on public.user_permissions(user_id);
create index if not exists idx_user_permissions_feature on public.user_permissions(feature);

-- Keep updated_at fresh on every change.
create or replace function public.touch_user_permission()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_user_permission on public.user_permissions;
create trigger trg_touch_user_permission
  before insert or update on public.user_permissions
  for each row execute function public.touch_user_permission();

-- ============================================================================
-- RLS — founders/admins manage everyone's rows; users may read their own.
-- ============================================================================
alter table public.user_permissions enable row level security;

create policy "user_permissions_admin_all" on public.user_permissions
  for all to authenticated
  using (public.is_admin() or public.is_founder())
  with check (public.is_admin() or public.is_founder());

create policy "user_permissions_self_read" on public.user_permissions
  for select to authenticated
  using (user_id = public.current_user_id());

-- ============================================================================
-- REALTIME — the CEO dashboard permission matrix updates live, like Discord.
-- ============================================================================
alter publication supabase_realtime add table public.user_permissions;
alter publication supabase_realtime add table public.profiles;
