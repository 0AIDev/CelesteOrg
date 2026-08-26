-- ============================================================================
-- MIGRATION 0025 — Skills Creator
-- Store agent skill definitions (skills.md files) for the team.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.skills (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  description     text,
  trigger_text    text,
  implementation  text NOT NULL,
  parameters      jsonb DEFAULT '[]'::jsonb,
  example_usage   text,
  author_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  upvotes         int NOT NULL DEFAULT 0,
  tags            text[] DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skills_author   ON public.skills (author_id);
CREATE INDEX IF NOT EXISTS idx_skills_upvotes  ON public.skills (upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_skills_tags     ON public.skills USING gin (tags);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read skills (shared team knowledge).
CREATE POLICY "skills_select"
  ON public.skills FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated members can create skills.
CREATE POLICY "skills_insert"
  ON public.skills FOR INSERT
  TO authenticated
  WITH CHECK (author_id = public.current_user_id());

-- Author or admin can update skills.
CREATE POLICY "skills_update"
  ON public.skills FOR UPDATE
  TO authenticated
  USING (author_id = public.current_user_id() OR public.is_admin())
  WITH CHECK (author_id = public.current_user_id() OR public.is_admin());

-- Author or admin can delete skills.
CREATE POLICY "skills_delete"
  ON public.skills FOR DELETE
  TO authenticated
  USING (author_id = public.current_user_id() OR public.is_admin());
