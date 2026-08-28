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

-- 3. Create issues + issue_comments tables
CREATE TABLE IF NOT EXISTS public.issues (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  status        text NOT NULL DEFAULT 'backlog'
                  CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'done')),
  priority      text NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  project_track text NOT NULL DEFAULT 'General'
                  CHECK (project_track IN ('Core AI', 'Frontend', 'Infrastructure', 'Design', 'General')),
  assignee_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  labels        jsonb DEFAULT '[]',
  due_date      date,
  position      integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issues_status   ON public.issues (status);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON public.issues (priority);
CREATE INDEX IF NOT EXISTS idx_issues_track    ON public.issues (project_track);
CREATE INDEX IF NOT EXISTS idx_issues_assignee ON public.issues (assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_position ON public.issues (status, position);

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "issues_select" ON public.issues;
DROP POLICY IF EXISTS "issues_insert" ON public.issues;
DROP POLICY IF EXISTS "issues_update" ON public.issues;
DROP POLICY IF EXISTS "issues_delete" ON public.issues;

CREATE POLICY "issues_select" ON public.issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "issues_insert" ON public.issues FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "issues_update" ON public.issues FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "issues_delete" ON public.issues FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.issue_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id   uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  author_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_comments_issue ON public.issue_comments (issue_id, created_at);

ALTER TABLE public.issue_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "issue_comments_select" ON public.issue_comments;
DROP POLICY IF EXISTS "issue_comments_insert" ON public.issue_comments;
DROP POLICY IF EXISTS "issue_comments_delete" ON public.issue_comments;

CREATE POLICY "issue_comments_select" ON public.issue_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "issue_comments_insert" ON public.issue_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "issue_comments_delete" ON public.issue_comments FOR DELETE TO authenticated USING (true);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'issues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.issues;
  END IF;
END $$;

-- 4. Add file_name column to documents if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN file_name text;
  END IF;
END $$;

-- 5. Add deal tracking columns to crm_contacts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_contacts' AND column_name = 'deal_value') THEN
    ALTER TABLE public.crm_contacts ADD COLUMN deal_value numeric;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_contacts' AND column_name = 'deal_stage') THEN
    ALTER TABLE public.crm_contacts ADD COLUMN deal_stage text DEFAULT 'none';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_contacts' AND column_name = 'deal_close_date') THEN
    ALTER TABLE public.crm_contacts ADD COLUMN deal_close_date date;
  END IF;
END $$;

-- 6. Create crm_activities table
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  type        text NOT NULL,
  description text NOT NULL,
  metadata    jsonb,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON public.crm_activities (contact_id, created_at DESC);

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_activities_select ON public.crm_activities;
DROP POLICY IF EXISTS crm_activities_insert ON public.crm_activities;
DROP POLICY IF EXISTS crm_activities_delete ON public.crm_activities;

CREATE POLICY crm_activities_select ON public.crm_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY crm_activities_insert ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY crm_activities_delete ON public.crm_activities FOR DELETE TO authenticated USING (true);
