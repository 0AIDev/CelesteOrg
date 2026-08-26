-- ============================================================================
-- MIGRATION 0021 — Internal Chat System (Slack/Discord-like)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.channels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text,
  is_private  boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content     text NOT NULL,
  attachments jsonb DEFAULT '[]',
  edited_at   timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.chat_messages (channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender  ON public.chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.chat_messages (created_at DESC);

-- ============================================================================
-- RLS — Channels
-- ============================================================================
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channels_select"
  ON public.channels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "channels_insert"
  ON public.channels FOR INSERT
  TO authenticated
  WITH CHECK (created_by = public.current_user_id());

CREATE POLICY "channels_update"
  ON public.channels FOR UPDATE
  TO authenticated
  USING (created_by = public.current_user_id() OR public.is_admin())
  WITH CHECK (created_by = public.current_user_id() OR public.is_admin());

CREATE POLICY "channels_delete"
  ON public.channels FOR DELETE
  TO authenticated
  USING (created_by = public.current_user_id() OR public.is_admin());

-- ============================================================================
-- RLS — Messages
-- ============================================================================
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "messages_insert"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = public.current_user_id());

CREATE POLICY "messages_update"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = public.current_user_id() OR public.is_admin())
  WITH CHECK (sender_id = public.current_user_id() OR public.is_admin());

CREATE POLICY "messages_delete"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (sender_id = public.current_user_id() OR public.is_admin());

-- ============================================================================
-- REALTIME
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

-- ============================================================================
-- SEED: default channels
-- ============================================================================
INSERT INTO public.channels (name, description, is_private) VALUES
  ('general', 'Company-wide announcements and general discussion', false),
  ('engineering', 'Engineering team discussion', false),
  ('ai-research', 'AI models, prompts, and research', false),
  ('design', 'Design, UX, and product design', false),
  ('random', 'Non-work stuff, memes, and water cooler', false),
  ('leadership', 'Private channel for founders and leadership', true)
ON CONFLICT (name) DO NOTHING;
