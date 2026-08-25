-- ============================================================================
-- CELESTE HQ — PROFILE NOTES & AI SUMMARY (0008)
-- 1) profile_notes: private notes a user writes about a teammate. Each note
--    is visible ONLY to its author (and admins). One note per (author, subject).
-- 2) profiles.summarize_with_ai: cached AI-generated summary of a person's
--    workspace history, written by the service role (or admins) and readable
--    by everyone in the org.
-- Idempotent: safe to run more than once.
-- ============================================================================

-- ── 1. Private notes ────────────────────────────────────────────────────────
create table if not exists public.profile_notes (
  author_id  uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.profiles(id) on delete cascade,
  note       text not null default '',
  updated_at timestamptz not null default now(),
  primary key (author_id, subject_id)
);

alter table public.profile_notes enable row level security;

-- Author-only read (admins may read everything).
drop policy if exists "profile_notes_select" on public.profile_notes;
create policy "profile_notes_select" on public.profile_notes
  for select to authenticated
  using (author_id = public.current_user_id() or public.is_admin());

-- Upsert of your own notes only.
drop policy if exists "profile_notes_upsert" on public.profile_notes;
create policy "profile_notes_upsert" on public.profile_notes
  for insert to authenticated
  with check (author_id = public.current_user_id());

drop policy if exists "profile_notes_update" on public.profile_notes;
create policy "profile_notes_update" on public.profile_notes
  for update to authenticated
  using (author_id = public.current_user_id())
  with check (author_id = public.current_user_id());

drop policy if exists "profile_notes_delete" on public.profile_notes;
create policy "profile_notes_delete" on public.profile_notes
  for delete to authenticated
  using (author_id = public.current_user_id());

-- ── 2. Cached AI summary on profiles ────────────────────────────────────────
alter table public.profiles
  add column if not exists summarize_with_ai text;

-- ── 3. Grants (RLS-backed; authenticated needs table privileges to write) ──
grant select, insert, update, delete on public.profile_notes to authenticated;
