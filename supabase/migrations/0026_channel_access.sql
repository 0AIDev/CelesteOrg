-- ============================================================================
-- MIGRATION 0026 — Channel Access Control
-- CEO and channel creator can manage who has access to channels.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.channel_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  added_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON public.channel_members(user_id);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read channel members (for UI).
CREATE POLICY "channel_members_select"
  ON public.channel_members FOR SELECT
  TO authenticated
  USING (true);

-- Channel admins and creators can add members.
CREATE POLICY "channel_members_insert"
  ON public.channel_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- CEO/founder can add to any channel
    public.is_admin()
    OR
    -- Channel creator can add to their own channel
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id AND c.created_by = public.current_user_id()
    )
    OR
    -- Channel admin can add members
    EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = channel_members.channel_id
      AND cm.user_id = public.current_user_id()
      AND cm.role = 'admin'
    )
  );

-- Channel admins and creators can remove members.
CREATE POLICY "channel_members_delete"
  ON public.channel_members FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id AND c.created_by = public.current_user_id()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = channel_members.channel_id
      AND cm.user_id = public.current_user_id()
      AND cm.role = 'admin'
    )
  );

-- Channel admins and creators can update member roles.
CREATE POLICY "channel_members_update"
  ON public.channel_members FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id AND c.created_by = public.current_user_id()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id AND c.created_by = public.current_user_id()
    )
  );

-- ============================================================================
-- Add is_admin boolean to channels for easy access check
-- ============================================================================
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;
