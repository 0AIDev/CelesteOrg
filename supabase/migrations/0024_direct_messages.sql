-- ============================================================================
-- MIGRATION 0024 — Direct Messages (1:1 messaging between users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     text NOT NULL,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dm_sender ON public.direct_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_receiver ON public.direct_messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_dm_conversation ON public.direct_messages (
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at DESC
);

-- ============================================================================
-- RLS — Direct Messages
-- ============================================================================
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm_select"
  ON public.direct_messages FOR SELECT
  TO authenticated
  USING (
    sender_id = public.current_user_id()
    OR receiver_id = public.current_user_id()
  );

CREATE POLICY "dm_insert"
  ON public.direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = public.current_user_id());

CREATE POLICY "dm_update"
  ON public.direct_messages FOR UPDATE
  TO authenticated
  USING (
    sender_id = public.current_user_id()
    OR receiver_id = public.current_user_id()
  )
  WITH CHECK (
    sender_id = public.current_user_id()
    OR receiver_id = public.current_user_id()
  );

CREATE POLICY "dm_delete"
  ON public.direct_messages FOR DELETE
  TO authenticated
  USING (sender_id = public.current_user_id());

-- ============================================================================
-- REALTIME
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  END IF;
END $$;
