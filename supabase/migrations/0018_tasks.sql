-- ============================================================================
-- MIGRATION 0018 — Sprint & Task Tracking Board
-- Kanban-style task management with status columns and priorities.
-- ============================================================================

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
  position     int NOT NULL DEFAULT 0,   -- ordering within a column
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status   ON public.tasks (status, position);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks (assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due      ON public.tasks (due_date);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Any authenticated member can read all tasks (team transparency).
CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated member can create tasks.
CREATE POLICY "tasks_insert"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (created_by = public.current_user_id());

-- Assignee, creator, or admin can update.
CREATE POLICY "tasks_update"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    assignee_id = public.current_user_id()
    OR created_by = public.current_user_id()
    OR public.is_admin_or_founder()
  )
  WITH CHECK (
    assignee_id = public.current_user_id()
    OR created_by = public.current_user_id()
    OR public.is_admin_or_founder()
  );

-- Creator or admin can delete.
CREATE POLICY "tasks_delete"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    created_by = public.current_user_id()
    OR public.is_admin_or_founder()
  );

-- ============================================================================
-- REALTIME
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;
