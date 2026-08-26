-- ============================================================================
-- MIGRATION 0019 — Screen & Video Recorder
-- Stores recording metadata and transcripts for async team communication.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.screen_recordings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL DEFAULT 'Untitled recording',
  description   text,
  file_path     text NOT NULL,               -- storage key
  file_name     text NOT NULL,
  file_size     bigint DEFAULT 0,
  mime_type     text DEFAULT 'video/webm',
  duration_sec  int DEFAULT 0,
  transcript    text,                        -- AI-generated transcript
  thumbnail_url text,                        -- optional frame grab URL
  author_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status        text DEFAULT 'uploading'
                CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recordings_author ON public.screen_recordings (author_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON public.screen_recordings (status);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.screen_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recordings_select"
  ON public.screen_recordings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "recordings_insert"
  ON public.screen_recordings FOR INSERT
  TO authenticated
  WITH CHECK (author_id = public.current_user_id());

CREATE POLICY "recordings_update"
  ON public.screen_recordings FOR UPDATE
  TO authenticated
  USING (author_id = public.current_user_id() OR public.is_admin())
  WITH CHECK (author_id = public.current_user_id() OR public.is_admin());

CREATE POLICY "recordings_delete"
  ON public.screen_recordings FOR DELETE
  TO authenticated
  USING (author_id = public.current_user_id() OR public.is_admin());

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('screen-recordings', 'screen-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their own folder
CREATE POLICY "recordings_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'screen-recordings');

-- Anyone authenticated can read (for playback)
CREATE POLICY "recordings_storage_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'screen-recordings');

-- Owner or admin can delete
CREATE POLICY "recordings_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'screen-recordings'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );
