-- ============================================================================
-- CELESTE HQ — SCHEMA RESET
-- Drops every object created by 0001_init.sql so you can re-run it cleanly.
-- SAFE ONLY at first setup (all tables are empty). Run this in the SQL editor,
-- then re-run 0001_init.sql.
-- ============================================================================

-- Storage: only drop the policy. Bucket/objects can't be deleted via SQL
-- (storage.protect_delete blocks it) — use the Storage API / dashboard if a
-- previous run left the bucket behind. At first setup it doesn't exist yet.
drop policy if exists "documents_bucket_admin" on storage.objects;

-- Tables (cascade removes their policies and FKs)
drop table if exists public.invites cascade;
drop table if exists public.approvals cascade;
drop table if exists public.daily_reports cascade;
drop table if exists public.ideas cascade;
drop table if exists public.calendar_events cascade;
drop table if exists public.api_metrics cascade;
drop table if exists public.equity_grants cascade;
drop table if exists public.document_signatures cascade;
drop table if exists public.documents cascade;
drop table if exists public.task_approvals cascade;
drop table if exists public.onboarding_tasks cascade;
drop table if exists public.roles cascade;
drop table if exists public.profiles cascade;
drop table if exists public.departments cascade;
drop table if exists public.audit_log cascade;

-- Functions (cascade also removes the auth.users trigger on handle_new_user)
drop function if exists public.handle_new_user() cascade;
drop function if exists public.sync_equity_unvested() cascade;
drop function if exists public.bootstrap_first_founder() cascade;
drop function if exists public.resolve_manager(uuid) cascade;
drop function if exists public.is_admin_or_founder() cascade;
drop function if exists public.is_founder() cascade;
drop function if exists public.current_user_id() cascade;
drop function if exists public.is_admin() cascade;
