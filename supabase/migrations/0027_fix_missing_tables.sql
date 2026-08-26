-- ============================================================================
-- FIX: Create all missing tables (channels, chat_messages, etc.)
-- Run this in Supabase SQL Editor if tables are missing
-- ============================================================================

-- Channels table
CREATE TABLE IF NOT EXISTS public.channels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text,
  is_private  boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content     text NOT NULL,
  attachments jsonb DEFAULT '[]',
  edited_at   timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Direct messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     text NOT NULL,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Channel members table
CREATE TABLE IF NOT EXISTS public.channel_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  added_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.chat_messages (channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_sender ON public.direct_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_receiver ON public.direct_messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON public.channel_members (channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON public.channel_members (user_id);

-- ============================================================================
-- RLS — Channels
-- ============================================================================
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "channels_select" ON public.channels;
CREATE POLICY "channels_select" ON public.channels FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "channels_insert" ON public.channels;
CREATE POLICY "channels_insert" ON public.channels FOR INSERT TO authenticated WITH CHECK (created_by = public.current_user_id());

DROP POLICY IF EXISTS "channels_update" ON public.channels;
CREATE POLICY "channels_update" ON public.channels FOR UPDATE TO authenticated
  USING (created_by = public.current_user_id() OR public.is_admin())
  WITH CHECK (created_by = public.current_user_id() OR public.is_admin());

DROP POLICY IF EXISTS "channels_delete" ON public.channels;
CREATE POLICY "channels_delete" ON public.channels FOR DELETE TO authenticated
  USING (created_by = public.current_user_id() OR public.is_admin());

-- ============================================================================
-- RLS — Chat Messages
-- ============================================================================
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON public.chat_messages;
CREATE POLICY "messages_select" ON public.chat_messages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "messages_insert" ON public.chat_messages;
CREATE POLICY "messages_insert" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (sender_id = public.current_user_id());

DROP POLICY IF EXISTS "messages_delete" ON public.chat_messages;
CREATE POLICY "messages_delete" ON public.chat_messages FOR DELETE TO authenticated
  USING (sender_id = public.current_user_id() OR public.is_admin());

-- ============================================================================
-- RLS — Direct Messages
-- ============================================================================
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm_select" ON public.direct_messages;
CREATE POLICY "dm_select" ON public.direct_messages FOR SELECT TO authenticated
  USING (sender_id = public.current_user_id() OR receiver_id = public.current_user_id());

DROP POLICY IF EXISTS "dm_insert" ON public.direct_messages;
CREATE POLICY "dm_insert" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = public.current_user_id());

DROP POLICY IF EXISTS "dm_delete" ON public.direct_messages;
CREATE POLICY "dm_delete" ON public.direct_messages FOR DELETE TO authenticated
  USING (sender_id = public.current_user_id() OR public.is_admin());

-- ============================================================================
-- RLS — Channel Members
-- ============================================================================
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "channel_members_select" ON public.channel_members;
CREATE POLICY "channel_members_select" ON public.channel_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "channel_members_insert" ON public.channel_members;
CREATE POLICY "channel_members_insert" ON public.channel_members FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.channels c WHERE c.id = channel_id AND c.created_by = public.current_user_id()
  ));

DROP POLICY IF EXISTS "channel_members_delete" ON public.channel_members;
CREATE POLICY "channel_members_delete" ON public.channel_members FOR DELETE TO authenticated
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.channels c WHERE c.id = channel_id AND c.created_by = public.current_user_id()
  ));

-- ============================================================================
-- REALTIME
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  END IF;
END $$;

-- ============================================================================
-- SEED: Default channels
-- ============================================================================
INSERT INTO public.channels (name, description, is_private) VALUES
  ('general', 'Company-wide announcements and general discussion', false),
  ('engineering', 'Engineering team discussion', false),
  ('ai-research', 'AI models, prompts, and research', false),
  ('design', 'Design, UX, and product design', false),
  ('random', 'Non-work stuff, memes, and water cooler', false),
  ('leadership', 'Private channel for founders and leadership', true)
ON CONFLICT (name) DO NOTHING;
