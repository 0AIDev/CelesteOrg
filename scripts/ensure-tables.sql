-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Create tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  status       text NOT NULL DEFAULT 'backlog'
               CHECK (status IN ('backlog', 'in_progress', 'in_review', 'done')),
  priority     text NOT NULL DEFAULT 'medium'
               CHECK (priority IN ('low', 'medium', 'urgent')),
  assignee_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date     date,
  position     int NOT NULL DEFAULT 0,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status   ON public.tasks (status, position);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks (assignee_id);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;

CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated USING (true);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;

-- 2. Create prompt_vault table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.prompt_vault (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  description     text,
  category        text NOT NULL DEFAULT 'General',
  prompt_content  text NOT NULL,
  author_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  upvotes         int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompt_vault_category ON public.prompt_vault (category);
CREATE INDEX IF NOT EXISTS idx_prompt_vault_author   ON public.prompt_vault (author_id);
CREATE INDEX IF NOT EXISTS idx_prompt_vault_upvotes  ON public.prompt_vault (upvotes DESC);

ALTER TABLE public.prompt_vault ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prompt_vault_select" ON public.prompt_vault;
DROP POLICY IF EXISTS "prompt_vault_insert" ON public.prompt_vault;
DROP POLICY IF EXISTS "prompt_vault_update" ON public.prompt_vault;
DROP POLICY IF EXISTS "prompt_vault_delete" ON public.prompt_vault;

CREATE POLICY "prompt_vault_select" ON public.prompt_vault FOR SELECT TO authenticated USING (true);
CREATE POLICY "prompt_vault_insert" ON public.prompt_vault FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "prompt_vault_update" ON public.prompt_vault FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "prompt_vault_delete" ON public.prompt_vault FOR DELETE TO authenticated USING (true);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'prompt_vault'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.prompt_vault;
  END IF;
END $$;

-- 3. Add file_name column to documents if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN file_name text;
  END IF;
END $$;
