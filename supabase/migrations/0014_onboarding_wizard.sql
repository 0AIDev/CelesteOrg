-- ============================================================================
-- MIGRATION 0014 — Multi-step onboarding wizard
-- ============================================================================

-- 1. Mark profiles as onboarded once the wizard is completed.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean not null default false;

-- 2. Step 3: Tech stack, hardware & local LLM setup
CREATE TABLE IF NOT EXISTS public.user_tech_specs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  primary_language text,          -- e.g. 'TypeScript', 'Python', 'Rust'
  frameworks      text[],        -- e.g. '{Next.js,React,Supabase}'
  local_model     text,          -- e.g. 'Phi-4-mini', 'DeepSeek-R1'
  hardware_notes  text,          -- free-form hardware/GPU notes
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id)
);

-- 3. Step 4: Work style, preferences & async routine
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  focus_hours          text,          -- e.g. '09:00-12:00, 14:00-17:00'
  communication_channel text,         -- 'Slack', 'Email', 'Discord', etc.
  notifications_enabled boolean not null default true,
  availability_status   text default 'available' check (availability_status in ('available','busy','away','dnd')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id)
);

-- 4. RLS — self read/write, admin read
ALTER TABLE public.user_tech_specs enable row level security;
ALTER TABLE public.user_preferences enable row level security;

CREATE POLICY "tech_specs_self_select" ON public.user_tech_specs
  FOR SELECT TO authenticated
  USING (user_id = public.current_user_id() OR public.is_admin());

CREATE POLICY "tech_specs_self_insert" ON public.user_tech_specs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "tech_specs_self_update" ON public.user_tech_specs
  FOR UPDATE TO authenticated
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "prefs_self_select" ON public.user_preferences
  FOR SELECT TO authenticated
  USING (user_id = public.current_user_id() OR public.is_admin());

CREATE POLICY "prefs_self_insert" ON public.user_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "prefs_self_update" ON public.user_preferences
  FOR UPDATE TO authenticated
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_tech_specs_user ON public.user_tech_specs(user_id);
CREATE INDEX IF NOT EXISTS idx_prefs_user ON public.user_preferences(user_id);
