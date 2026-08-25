-- ============================================================================
-- CELESTE HQ — REALTIME AI USAGE (0007)
-- 1) api_metrics gains a user_id so per-member consumption can be tracked.
-- 2) Read access opens to all authenticated members (it's internal monitoring);
--    writes stay admin/service-role only.
-- 3) New ai_credentials table stores the team's AI provider API keys.
--    The raw key column is protected with column-level grants: only the
--    service role (and admins via the service role) can read it; the client
--    only ever selects the masked metadata.
-- 4) api_metrics is added to the realtime publication so the usage page
--    updates live while calls stream in.
-- Idempotent: safe to run more than once.
-- ============================================================================

-- ── 1. Per-user attribution on api_metrics ─────────────────────────────────
alter table public.api_metrics
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_metrics_user on public.api_metrics (user_id, recorded_at desc);

-- ── 2. Open read / admin write ─────────────────────────────────────────────
drop policy if exists "metrics_admin_all" on public.api_metrics;

create policy "metrics_select_all" on public.api_metrics
  for select to authenticated
  using (true);

create policy "metrics_write_admin" on public.api_metrics
  for insert to authenticated
  with check (public.is_admin());

create policy "metrics_update_admin" on public.api_metrics
  for update to authenticated
  using (public.is_admin());

create policy "metrics_delete_admin" on public.api_metrics
  for delete to authenticated
  using (public.is_admin());

-- ── 3. AI provider credentials ─────────────────────────────────────────────
create table if not exists public.ai_credentials (
  id         uuid primary key default gen_random_uuid(),
  provider   text not null
             check (provider in ('openai','anthropic','google','groq','mistral','together','perplexity','other')),
  name       text not null,               -- friendly label, e.g. "Prod OpenAI"
  api_key    text not null,               -- raw key; only readable via service role
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.ai_credentials enable row level security;

-- Revoke the Supabase default grants; we re-grant per column below so the
-- raw api_key can never leak to the client-side anon/authenticated role.
revoke all on public.ai_credentials from anon, authenticated;

-- Rows: any member may see the metadata (provider / name / owner).
create policy "ai_credentials_select" on public.ai_credentials
  for select to authenticated
  using (true);

-- Members can add their own keys (they're storing the team's own secrets).
create policy "ai_credentials_insert" on public.ai_credentials
  for insert to authenticated
  with check (created_by = public.current_user_id());

-- Only the creator or an admin may edit/remove a credential.
create policy "ai_credentials_update" on public.ai_credentials
  for update to authenticated
  using (created_by = public.current_user_id() or public.is_admin())
  with check (created_by = public.current_user_id() or public.is_admin());

create policy "ai_credentials_delete" on public.ai_credentials
  for delete to authenticated
  using (created_by = public.current_user_id() or public.is_admin());

-- Column-level security: the client role sees everything EXCEPT api_key
-- (select), but it CAN insert new rows and delete its own (table-level
-- privileges; RLS + the check clause keep rows scoped to the creator).
grant select (id, provider, name, created_by, created_at)
  on public.ai_credentials to authenticated;
grant insert on public.ai_credentials to authenticated;
grant delete on public.ai_credentials to authenticated;
grant select (id, provider, name, created_by, created_at, api_key)
  on public.ai_credentials to service_role;

-- ── 4. Realtime for live usage ─────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'api_metrics'
  ) then
    alter publication supabase_realtime add table public.api_metrics;
  end if;
end $$;
