-- 0004: Developer API keys
-- Users mint scoped keys for internal tooling; the raw key is only shown once
-- at creation time (stored as a SHA-256 hash).

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  key_hash text not null unique,          -- sha256 of the raw key
  prefix text not null,                   -- display-only prefix (e.g. cel_xxxx…)
  scopes text[] not null default '{read}',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.api_keys enable row level security;

-- Users see only their own keys; admins see all (for auditing).
create policy "api_keys_select_own"
  on public.api_keys for select
  using (
    auth.uid() = user_id
    or public.is_admin()
  );

-- Only the owner can create / revoke their own keys.
create policy "api_keys_insert_own"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

create policy "api_keys_update_own"
  on public.api_keys for update
  using (auth.uid() = user_id and revoked_at is null)
  with check (auth.uid() = user_id);

create index if not exists api_keys_user_idx on public.api_keys (user_id);
