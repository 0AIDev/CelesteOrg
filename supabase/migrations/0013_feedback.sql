-- ============================================================================
-- CELESTE HQ — 0013: Team feedback
-- Feedback about anything that helps the team improve (tooling, process,
-- culture, workspace...). Distinct from `ideas` (product/feature backlog).
-- ============================================================================

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references public.profiles(id) on delete set null,
  category    text not null default 'General'
              check (category in ('General', 'Tooling', 'Process', 'Culture', 'Workspace', 'Other')),
  content     text not null check (char_length(content) >= 3),
  created_at  timestamptz not null default now()
);

create index if not exists idx_feedback_author on public.feedback(author_id);
create index if not exists idx_feedback_created on public.feedback(created_at desc);

-- Everyone can read the team's feedback (it's for the whole team to improve);
-- authors write their own row.
alter table public.feedback enable row level security;

create policy "feedback_select_all" on public.feedback
  for select to authenticated using (true);

create policy "feedback_insert_self" on public.feedback
  for insert to authenticated
  with check (author_id = public.current_user_id());

-- Realtime so a future feedback page updates live.
alter publication supabase_realtime add table public.feedback;
