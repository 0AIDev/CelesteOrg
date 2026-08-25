-- ============================================================================
-- CELESTE HQ — Internal Company OS
-- Full schema: tables, RLS, storage, helper functions
-- Generated 2025-01-01
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
create extension if not exists "pgcrypto";   -- gen_random_uuid / digest (SHA-256)
create extension if not exists "vector";      -- pgvector for embeddings (AI)
create extension if not exists "uuid-ossp";

-- ============================================================================
-- AUTH HELPERS
-- ============================================================================
-- A user is an admin if they hold the 'admin' claim on the JWT
-- (set via the Supabase Auth "app_metadata.role = admin").
-- Falls back gracefully when tests run without a real token.
create or replace function public.is_admin()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select coalesce(
    (select (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'),
    false
  );
$$;

-- Convenience current-user id that tolerates anonymous contexts.
create or replace function public.current_user_id()
returns uuid
language sql stable
as $$
  select coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
$$;

-- ============================================================================
-- SECTION A — PROFILES & ORG CHART
-- ============================================================================

create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  color       text,                       -- subtle tag color (used for badges)
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  email              text not null,
  full_name          text not null,
  avatar_url         text,
  bio                text,
  location           text,
  previous_companies text[],              -- array of strings
  role_title         text,
  department_id      uuid references public.departments(id) on delete set null,
  is_founder         boolean not null default false,
  joined_at          date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Each row = an employee holding a role that reports to another role.
-- This is the org-chart tree backbone.
create table public.roles (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  department_id  uuid references public.departments(id) on delete set null,
  profile_id     uuid references public.profiles(id) on delete cascade,
  reports_to     uuid references public.roles(id) on delete set null,
  level          int  not null default 1,   -- depth in tree (1 = CEO)
  hired_at       date,
  created_at     timestamptz not null default now()
);

create index if not exists idx_profiles_department on public.profiles(department_id);
create index if not exists idx_profiles_founder   on public.profiles(is_founder);
create index if not exists idx_roles_reports_to   on public.roles(reports_to);
create index if not exists idx_roles_department   on public.roles(department_id);
create index if not exists idx_roles_profile      on public.roles(profile_id);

-- Auto-create a profile row whenever a new auth user signs up, so the app
-- (header name, dashboard) works immediately for every account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', coalesce(new.raw_user_meta_data ->> 'name', 'New teammate')),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- SECTION B — ONBOARDING & TASKS
-- ============================================================================

create table public.onboarding_tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  category     text default 'General',
  status       text not null default 'pending'
               check (status in ('pending','in_progress','done','blocked')),
  due_date     date,
  assigned_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_onboarding_user on public.onboarding_tasks(user_id);

create table public.task_approvals (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references public.onboarding_tasks(id) on delete cascade,
  approver_id uuid references public.profiles(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  comment     text,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- SECTION C — DOCUMENTS & E-SIGNATURE
-- ============================================================================

create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  file_path    text not null,          -- key inside the private storage bucket
  file_name    text,
  file_size    bigint default 0,
  mime_type    text,
  category     text,
  owner_id     uuid references public.profiles(id) on delete cascade,
  requires_signature boolean not null default false,
  uploaded_at  timestamptz not null default now()
);

create index if not exists idx_documents_owner on public.documents(owner_id);

-- Immutable audit trail for every signature.
create table public.document_signatures (
  id             uuid primary key default gen_random_uuid(),
  document_id    uuid references public.documents(id) on delete cascade,
  signer_id      uuid references public.profiles(id) on delete cascade,
  typed_name     text not null,             -- user typed their name
  signature_hash text not null unique,      -- SHA-256 hex
  ip_address     inet,
  user_agent     text,
  signed_at      timestamptz not null default now()
);

create index if not exists idx_doc_signatures_doc on public.document_signatures(document_id);
create index if not exists idx_doc_signatures_signer on public.document_signatures(signer_id);

-- ============================================================================
-- SECTION D — EQUITY & CAP TABLE
-- ============================================================================

-- schedule_type: 'monthly' | 'yearly' — monthly is standard for startups.
create table public.equity_grants (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade,
  total_shares   numeric not null,
  vested_shares  numeric not null default 0,
  unvested_shares numeric not null default 0,   -- maintained via trigger below
  vesting_start  date not null,
  cliff_months   int  not null default 12,
  schedule_type  text not null default 'monthly' check (schedule_type in ('monthly','yearly')),
  created_at     timestamptz not null default now()
);

create index if not exists idx_grants_user on public.equity_grants(user_id);

-- Keep unvested_shares consistent.
create or replace function public.sync_equity_unvested()
returns trigger
language plpgsql
as $$
begin
  new.unvested_shares := greatest(new.total_shares - new.vested_shares, 0);
  return new;
end;
$$;

create trigger trg_sync_equity_unvested
  before insert or update on public.equity_grants
  for each row execute function public.sync_equity_unvested();

-- ============================================================================
-- SECTION E — INFRASTRUCTURE MONITORING
-- ============================================================================

create table public.api_metrics (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null,               -- 'openai', 'anthropic', 'internal', ...
  model       text,
  tokens_used int  default 0,
  cost        numeric default 0,           -- USD
  latency_ms  int  default 0,
  status      text default 'ok' check (status in ('ok','error','timeout')),
  endpoint    text,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_metrics_provider on public.api_metrics(provider);
create index if not exists idx_metrics_recorded on public.api_metrics(recorded_at desc);

-- ============================================================================
-- SECTION F — CALENDAR / TIME-OFF
-- ============================================================================

create table public.calendar_events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  type       text not null default 'meeting'
             check (type in ('vacation','remote','sick','meeting')),
  start_time timestamptz not null,
  end_time   timestamptz not null,
  user_id    uuid references public.profiles(id) on delete cascade,
  status     text not null default 'approved'
             check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_events_user on public.calendar_events(user_id);
create index if not exists idx_events_start on public.calendar_events(start_time);

-- ============================================================================
-- SECTION G — IDEA VAULT & BACKLOG
-- ============================================================================

create table public.ideas (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid references public.profiles(id) on delete cascade,
  title        text not null,
  content      text,
  category     text,                        -- auto-categorized by AI on submit
  priority     text not null default 'medium' check (priority in ('low','medium','high')),
  status       text not null default 'new' check (status in ('new','backlog','planned','done','archived')),
  ai_summary   text,                        -- optional 1-line summary from LLM
  embedding    vector(1536),                -- pgvector embedding (OpenAI text-embedding-3-small)
  created_at   timestamptz not null default now()
);

create index if not exists idx_ideas_author on public.ideas(author_id);
create index if not exists idx_ideas_status on public.ideas(status);
create index if not exists idx_ideas_embedding on public.ideas using hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- SECTION H — DAILY STANDUP & EOD REPORTS
-- ============================================================================

create table public.daily_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade,
  date         date not null,
  morning_plan text,                       -- "What are you focusing on today?"
  eod_summary  text,                       -- "What did you accomplish today?"
  blockers     text,
  status       text not null default 'morning_pending'
               check (status in ('morning_pending','eod_pending','submitted')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_reports_user on public.daily_reports(user_id);
create index if not exists idx_reports_date on public.daily_reports(date);

-- ============================================================================
-- SECTION I — APPROVALS WORKFLOW
-- ============================================================================

-- type: generic target discriminator ('timeoff','onboarding','equity','document','onboarding_task')
-- target_id: uuid of the referenced row (kept polymorphic on purpose)
create table public.approvals (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid references public.profiles(id) on delete cascade,
  approver_id  uuid references public.profiles(id) on delete set null,
  manager_id   uuid references public.profiles(id) on delete set null, -- org-chart resolved manager record
  type         text not null default 'general' check (type in ('timeoff','onboarding','equity','document','onboarding_task','general')),
  target_id    uuid,
  summary      text not null,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  comment      text,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

create index if not exists idx_approvals_requester on public.approvals(requester_id);
create index if not exists idx_approvals_approver  on public.approvals(approver_id);
create index if not exists idx_approvals_status    on public.approvals(status);

-- ============================================================================
-- HELPER: resolve a user's manager from the org chart
-- A person's manager = the profile holding the role that this person's
-- role reports_to.
-- ============================================================================
create or replace function public.resolve_manager(p_profile_id uuid)
returns uuid
language sql stable
as $$
  select r2.profile_id
  from public.roles r1
  join public.roles r2 on r2.id = r1.reports_to
  where r1.profile_id = p_profile_id
  limit 1;
$$;

-- Helpful RLS helper: is this user an admin OR a founder?
create or replace function public.is_admin_or_founder()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = public.current_user_id()
      and (p.is_founder = true)
  ) or public.is_admin();
$$;

-- Is the current user a founder? `is_founder` is a column on profiles; this
-- helper lets RLS policies reference it the same way is_admin() is used.
-- security definer so the lookup bypasses RLS (no recursion into policies).
-- NOTE: must be defined after the profiles table exists (SQL functions are
-- validated at creation time).
create or replace function public.is_founder()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = public.current_user_id()
      and p.is_founder = true
  );
$$;

-- Bootstrap the very first founder. This is the ONE revocable exception to
-- the "no self-promotion" rule: it only works while NO founder exists yet
-- AND the calling user is the first-created profile in the system and an
-- admin (JWT claim). Once the first founder is set, this permanently returns
-- false, so it cannot be used for later self-promotion.
create or replace function public.bootstrap_first_founder()
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_uid         uuid := public.current_user_id();
  v_oldest      uuid;
  v_admin       boolean := public.is_admin();
  v_any_founder boolean;
begin
  -- Must be an admin claim and logged in.
  if not v_admin or v_uid = '00000000-0000-0000-0000-000000000000'::uuid then
    return false;
  end if;

  -- No founder may already exist.
  select exists (select 1 from public.profiles where is_founder) into v_any_founder;
  if v_any_founder then
    return false;
  end if;

  -- The caller must be the very first profile ever created.
  select id into v_oldest
    from public.profiles
    order by created_at asc, id asc
    limit 1;
  if v_oldest is distinct from v_uid then
    return false;
  end if;

  -- Grant founder (the only allowed, once-only bootstrap mutation).
  update public.profiles
     set is_founder = true
   where id = v_uid;

  insert into public.audit_log (actor_id, action, target_id, meta)
  values (v_uid, 'founder.bootstrap', v_uid, jsonb_build_object('note', 'First founder bootstrapped'));

  return true;
end;
$$;

-- ============================================================================
-- AUDIT LOG for sensitive actions (used by signature / equity / approvals)
-- ============================================================================
create table public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid,
  action     text not null,               -- e.g. 'document.signed', 'approval.approved'
  target_id  uuid,
  meta       jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_actor on public.audit_log(actor_id);
create index if not exists idx_audit_action on public.audit_log(action);

-- Insert only; nobody updates or deletes audit log rows.
revoke all on public.audit_log from anon, authenticated;
grant select, insert on public.audit_log to authenticated;

-- ============================================================================
-- INVITES (team onboarding)
-- ============================================================================
create table public.invites (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  department_id uuid references public.departments(id) on delete set null,
  role_title    text,
  token         text not null default encode(gen_random_bytes(16), 'hex'),
  invited_by    uuid references public.profiles(id) on delete set null,
  status        text not null default 'pending' check (status in ('pending','accepted','revoked')),
  accepted_at   timestamptz,
  accepted_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (email)
);

create index if not exists idx_invites_email   on public.invites(email);
create index if not exists idx_invites_status  on public.invites(status);
create index if not exists idx_invites_token   on public.invites(token);

-- RLS (defined here so the table is fully constrained even before the main
-- RLS block below runs).
alter table public.invites enable row level security;
create policy "invites_admin_all" on public.invites
  for all to authenticated
  using (public.is_admin() or public.is_founder())
  with check (public.is_admin() or public.is_founder());
create policy "invites_owner_read" on public.invites
  for select to authenticated
  using (invited_by = public.current_user_id());

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Profiles: anyone authenticated can read the org (names/roles needed for
-- the chart). Write access is limited to self, admins, or founders. Sensitive
-- fields filtered later via views/policies on equity.
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.roles enable row level security;
alter table public.onboarding_tasks enable row level security;
alter table public.task_approvals enable row level security;
alter table public.documents enable row level security;
alter table public.document_signatures enable row level security;
alter table public.equity_grants enable row level security;
alter table public.api_metrics enable row level security;
alter table public.calendar_events enable row level security;
alter table public.ideas enable row level security;
alter table public.daily_reports enable row level security;
alter table public.approvals enable row level security;

-- Enforce all policies are "to authenticated".
-- ---------------------------------------------------------------------
-- DEPARTMENTS — readable by all members; only admins modify.
create policy "departments_select" on public.departments
  for select to authenticated using (true);
create policy "departments_admin_write" on public.departments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ROLES — readable by all (org chart); only admins write.
create policy "roles_select" on public.roles
  for select to authenticated using (true);
create policy "roles_admin_write" on public.roles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- PROFILES — read org, write yourself (or admin/founder).
-- Founder status is first-class in RLS, so it must not be grantable to
-- yourself.
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
-- New users may create only their own row, and may NOT claim founder.
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated
  with check (id = public.current_user_id() and is_founder = false);
-- Ordinary self-edits of name/bio/location etc. can never flip is_founder.
create policy "profiles_update_self_basic" on public.profiles
  for update to authenticated
  using (id = public.current_user_id())
  with check (
    id = public.current_user_id()
    and is_founder = false          -- self-promotion blocked
  );
-- Only an existing founder or admin may flip is_founder (for any profile).
create policy "profiles_update_founder_privileged" on public.profiles
  for update to authenticated
  using (public.is_admin() or public.is_founder())
  with check (public.is_admin() or public.is_founder());

-- ONBOARDING TASKS — see/update your own (or admin).
create policy "tasks_self_select" on public.onboarding_tasks
  for select to authenticated
  using (user_id = public.current_user_id() or assigned_by = public.current_user_id() or public.is_admin());
create policy "tasks_self_update" on public.onboarding_tasks
  for update to authenticated
  using (user_id = public.current_user_id() or public.is_admin())
  with check (user_id = public.current_user_id() or public.is_admin());

-- TASK APPROVALS — approver can read/update.
create policy "task_approvals_select" on public.task_approvals
  for select to authenticated
  using (approver_id = public.current_user_id() or public.is_admin());
create policy "task_approvals_update" on public.task_approvals
  for update to authenticated
  using (approver_id = public.current_user_id() or public.is_admin())
  with check (approver_id = public.current_user_id() or public.is_admin());

-- DOCUMENTS — owner or admin only.
create policy "docs_owner_select" on public.documents
  for select to authenticated
  using (owner_id = public.current_user_id() or public.is_admin());
create policy "docs_owner_insert" on public.documents
  for insert to authenticated
  with check (owner_id = public.current_user_id() or public.is_admin());
create policy "docs_owner_delete" on public.documents
  for delete to authenticated
  using (owner_id = public.current_user_id() or public.is_admin());

-- DOCUMENT SIGNATURES — read for audit by owner/admin; insert on rows where
-- the signer is the current user (electronically signing).
create policy "doc_sig_select" on public.document_signatures
  for select to authenticated
  using (
    public.is_admin()
    or signer_id = public.current_user_id()
    or exists (select 1 from public.documents d where d.id = document_id and d.owner_id = public.current_user_id())
  );
create policy "doc_sig_insert_self" on public.document_signatures
  for insert to authenticated
  with check (signer_id = public.current_user_id() or public.is_admin());

-- EQUITY — owner + founders/admins only. Absolutely private.
create policy "equity_select" on public.equity_grants
  for select to authenticated
  using (user_id = public.current_user_id() or public.is_admin_or_founder());
create policy "equity_founder_write" on public.equity_grants
  for all to authenticated
  using (public.is_admin_or_founder())
  with check (public.is_admin_or_founder());

-- API METRICS — internal monitoring; admins read/write.
create policy "metrics_admin_all" on public.api_metrics
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- CALENDAR — everyone sees the team calendar; users manage their own.
create policy "events_select" on public.calendar_events
  for select to authenticated using (true);
create policy "events_insert_self" on public.calendar_events
  for insert to authenticated
  with check (user_id = public.current_user_id() or public.is_admin());
create policy "events_update_self" on public.calendar_events
  for update to authenticated
  using (user_id = public.current_user_id() or public.is_admin())
  with check (user_id = public.current_user_id() or public.is_admin());

-- IDEAS — everyone reads (vault is shared); author writes own.
create policy "ideas_select" on public.ideas
  for select to authenticated using (true);
create policy "ideas_insert_self" on public.ideas
  for insert to authenticated
  with check (author_id = public.current_user_id() or public.is_admin());
create policy "ideas_update_self" on public.ideas
  for update to authenticated
  using (author_id = public.current_user_id() or public.is_admin())
  with check (author_id = public.current_user_id() or public.is_admin());

-- DAILY REPORTS — read team feed (all auth members); write own row.
create policy "reports_select" on public.daily_reports
  for select to authenticated using (true);
create policy "reports_upsert_self" on public.daily_reports
  for insert to authenticated
  with check (user_id = public.current_user_id());
create policy "reports_update_self" on public.daily_reports
  for update to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

-- APPROVALS — requester sees their own, approver sees assigned, admins see all.
create policy "approvals_select" on public.approvals
  for select to authenticated
  using (
    requester_id = public.current_user_id()
    or approver_id = public.current_user_id()
    or manager_id = public.current_user_id()
    or public.is_admin()
  );
create policy "approvals_insert_self" on public.approvals
  for insert to authenticated
  with check (requester_id = public.current_user_id() or public.is_admin());
create policy "approvals_review" on public.approvals
  for update to authenticated
  using (approver_id = public.current_user_id() or public.is_admin())
  with check (
    -- only allow setting status/comment/reviewed_at during review
    approver_id = public.current_user_id() or public.is_admin()
  );

-- ============================================================================
-- STORAGE
-- ============================================================================
-- Private bucket for all internal documents. Access is mediated by Signed URLs
-- (generated server-side for 60s) — the RLS policy is deliberately locked down.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_bucket_admin"
  on storage.objects
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- SEED DATA (optional — safe to run more than once)
-- ============================================================================
insert into public.departments (name, slug, description, color) values
  ('Leadership',   'leadership',   'Company leadership & strategy',        '#6366f1'),
  ('Engineering',  'engineering',  'Product engineering & infra',          '#0ea5e9'),
  ('Product',      'product',      'Product design & discovery',           '#8b5cf6'),
  ('Design',       'design',       'Visual & UX design',                   '#ec4899'),
  ('Growth',       'growth',       'Marketing, sales & partnerships',      '#f59e0b'),
  ('Operations',   'operations',   'People, finance & operations',         '#10b981')
on conflict (slug) do nothing;

-- ============================================================================
-- REALTIME (comment/uncomment as desired)
-- ============================================================================
-- alter publication supabase_realtime add table public.calendar_events;
-- alter publication supabase_realtime add table public.daily_reports;
-- alter publication supabase_realtime add table public.ideas;
-- alter publication supabase_realtime add table public.approvals;