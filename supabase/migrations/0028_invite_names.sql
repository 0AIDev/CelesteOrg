-- Store the invitee's chosen display name for personalized onboarding.
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS full_name text;
