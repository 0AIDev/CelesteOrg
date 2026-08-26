-- ============================================================================
-- MIGRATION 0016 — AI Prompt & Workflow Vault
-- Shared library of prompts, system prompts, and automation recipes.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prompt_vault (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  description     text,
  category        text NOT NULL DEFAULT 'General'
                  CHECK (category IN ('Cursor', 'Claude', 'ChatGPT', 'Gemini', 'Groq', 'Automation', 'System Prompt', 'Workflow', 'DevOps', 'General')),
  prompt_content  text NOT NULL,
  author_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  upvotes         int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompt_vault_category ON public.prompt_vault (category);
CREATE INDEX IF NOT EXISTS idx_prompt_vault_author   ON public.prompt_vault (author_id);
CREATE INDEX IF NOT EXISTS idx_prompt_vault_upvotes  ON public.prompt_vault (upvotes DESC);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.prompt_vault ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read the vault (shared team knowledge).
CREATE POLICY "prompt_vault_select"
  ON public.prompt_vault FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated members can create prompts.
CREATE POLICY "prompt_vault_insert"
  ON public.prompt_vault FOR INSERT
  TO authenticated
  WITH CHECK (author_id = public.current_user_id());

-- Author or admin can update (title, content, category, upvotes).
CREATE POLICY "prompt_vault_update"
  ON public.prompt_vault FOR UPDATE
  TO authenticated
  USING (author_id = public.current_user_id() OR public.is_admin())
  WITH CHECK (author_id = public.current_user_id() OR public.is_admin());

-- Author or admin can delete.
CREATE POLICY "prompt_vault_delete"
  ON public.prompt_vault FOR DELETE
  TO authenticated
  USING (author_id = public.current_user_id() OR public.is_admin());
