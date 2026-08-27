-- Notion integration credentials and synchronized page cache.
CREATE TABLE IF NOT EXISTS public.notion_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_name text NOT NULL,
  bot_id text,
  access_token text NOT NULL,
  workspace_icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notion_pages_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'Untitled',
  url text,
  parent_type text,
  last_edited_time timestamptz,
  content_snippet text,
  vector_indexed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notion_pages_last_edited
  ON public.notion_pages_cache(last_edited_time DESC);

ALTER TABLE public.notion_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notion_pages_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notion_integrations_team_read" ON public.notion_integrations;
CREATE POLICY "notion_integrations_team_read"
  ON public.notion_integrations FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "notion_integrations_admin_write" ON public.notion_integrations;
CREATE POLICY "notion_integrations_admin_write"
  ON public.notion_integrations FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_founder())
  WITH CHECK (public.is_admin() OR public.is_founder());

DROP POLICY IF EXISTS "notion_pages_team_read" ON public.notion_pages_cache;
CREATE POLICY "notion_pages_team_read"
  ON public.notion_pages_cache FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "notion_pages_admin_write" ON public.notion_pages_cache;
CREATE POLICY "notion_pages_admin_write"
  ON public.notion_pages_cache FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_founder())
  WITH CHECK (public.is_admin() OR public.is_founder());
