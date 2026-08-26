-- ============================================================================
-- MIGRATION 0022 — Issue Tracking & Bug Reporting (Linear-like)
-- ============================================================================

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issues_status   ON public.issues (status);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON public.issues (priority);
CREATE INDEX IF NOT EXISTS idx_issues_track    ON public.issues (project_track);
CREATE INDEX IF NOT EXISTS idx_issues_assignee ON public.issues (assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_creator  ON public.issues (creator_id);
CREATE INDEX IF NOT EXISTS idx_issues_position ON public.issues (status, position);
CREATE INDEX IF NOT EXISTS idx_issues_created  ON public.issues (created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_issues_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS issues_updated_at ON public.issues;
CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_issues_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "issues_select"
  ON public.issues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "issues_insert"
  ON public.issues FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = public.current_user_id());

CREATE POLICY "issues_update"
  ON public.issues FOR UPDATE
  TO authenticated
  USING (creator_id = public.current_user_id() OR assignee_id = public.current_user_id() OR public.is_admin())
  WITH CHECK (creator_id = public.current_user_id() OR assignee_id = public.current_user_id() OR public.is_admin());

CREATE POLICY "issues_delete"
  ON public.issues FOR DELETE
  TO authenticated
  USING (creator_id = public.current_user_id() OR public.is_admin());

-- ============================================================================
-- Realtime
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'issues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.issues;
  END IF;
END $$;

-- ============================================================================
-- Comments table (threaded discussion on issues)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.issue_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id   uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  author_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_comments_issue ON public.issue_comments (issue_id, created_at);

ALTER TABLE public.issue_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "issue_comments_select"
  ON public.issue_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "issue_comments_insert"
  ON public.issue_comments FOR INSERT TO authenticated WITH CHECK (author_id = public.current_user_id());

CREATE POLICY "issue_comments_delete"
  ON public.issue_comments FOR DELETE TO authenticated USING (author_id = public.current_user_id() OR public.is_admin());
