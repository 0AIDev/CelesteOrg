-- ============================================================================
-- MIGRATION 0015 — GitHub Events Feed
-- Stores incoming webhook events from GitHub repos and AI-generated summaries.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.github_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   text NOT NULL,               -- 'push', 'pull_request', 'pull_request_review', 'deployment_status', 'issues', 'release', …
  repository   text NOT NULL,               -- 'owner/repo' e.g. '0AIDev/CelesteOrg'
  sender       text,                        -- GitHub login of the actor
  sender_avatar text,                       -- avatar URL (cached from webhook payload)
  title        text,                        -- PR/commit/release title
  body         text,                        -- PR/issue body or commit message
  branch       text,                        -- branch name (for push / PR)
  pr_number    int,                         -- pull request number
  pr_url       text,                        -- link to the PR / commit / issue
  ai_summary   text,                        -- AI-generated 2-sentence summary
  payload      jsonb NOT NULL DEFAULT '{}', -- full raw webhook payload
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Indexes for feed queries (recent first, filter by repo / event type)
CREATE INDEX IF NOT EXISTS idx_github_events_created   ON public.github_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_events_repo      ON public.github_events (repository);
CREATE INDEX IF NOT EXISTS idx_github_events_type      ON public.github_events (event_type);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.github_events ENABLE ROW LEVEL SECURITY;

-- Any authenticated member can read the feed (it's internal team visibility).
CREATE POLICY "github_events_select"
  ON public.github_events FOR SELECT
  TO authenticated
  USING (true);

-- Only the service role (webhook endpoint) can insert.
-- The webhook route uses the service-role client which bypasses RLS,
-- but we also grant insert to authenticated so the API route works if
-- it runs under a user session.
CREATE POLICY "github_events_insert"
  ON public.github_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins / founders can delete (moderation).
CREATE POLICY "github_events_delete_admin"
  ON public.github_events FOR DELETE
  TO authenticated
  USING (public.is_admin_or_founder());

-- ============================================================================
-- REALTIME
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'github_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.github_events;
  END IF;
END $$;
