-- ============================================================================
-- MIGRATION 0023 — Social Media Drafts & Launch Planner
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.social_drafts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform       text NOT NULL DEFAULT 'twitter'
                   CHECK (platform IN ('twitter', 'linkedin')),
  title          text,
  content        text NOT NULL,
  status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'scheduled', 'published')),
  scheduled_for  timestamptz,
  media_urls     jsonb DEFAULT '[]',
  hashtags       text[],
  author_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at   timestamptz,
  engagement     jsonb DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_drafts_status ON public.social_drafts (status);
CREATE INDEX IF NOT EXISTS idx_social_drafts_platform ON public.social_drafts (platform);
CREATE INDEX IF NOT EXISTS idx_social_drafts_scheduled ON public.social_drafts (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_social_drafts_author ON public.social_drafts (author_id);
CREATE INDEX IF NOT EXISTS idx_social_drafts_created ON public.social_drafts (created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_social_drafts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS social_drafts_updated_at ON public.social_drafts;
CREATE TRIGGER social_drafts_updated_at
  BEFORE UPDATE ON public.social_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_social_drafts_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.social_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_drafts_select"
  ON public.social_drafts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "social_drafts_insert"
  ON public.social_drafts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = public.current_user_id());

CREATE POLICY "social_drafts_update"
  ON public.social_drafts FOR UPDATE
  TO authenticated
  USING (author_id = public.current_user_id() OR public.is_admin())
  WITH CHECK (author_id = public.current_user_id() OR public.is_admin());

CREATE POLICY "social_drafts_delete"
  ON public.social_drafts FOR DELETE
  TO authenticated
  USING (author_id = public.current_user_id() OR public.is_admin());

-- ============================================================================
-- Realtime
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'social_drafts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.social_drafts;
  END IF;
END $$;
