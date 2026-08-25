-- ============================================================================
-- CELESTE HQ — DOCUMENTS UPLOAD FOR ALL MEMBERS (0009)
-- The documents bucket policy was admin-only, so regular members got
-- "Upload failed (400)" when uploading a file.
-- Fix: any authenticated member can insert (and read) objects inside their
-- own folder (`<user_id>/...`, the path the server always builds for them).
-- Downloads still go through server-generated signed URLs.
-- Idempotent: safe to run more than once.
-- ============================================================================

-- Members may upload to their own folder.
drop policy if exists "documents_bucket_member_insert" on storage.objects;
create policy "documents_bucket_member_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Members may read objects in their own folder (preview before the record
-- row is created; signed URLs cover everything after).
drop policy if exists "documents_bucket_member_select" on storage.objects;
create policy "documents_bucket_member_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Members may remove objects they own (keeps "delete document" working).
drop policy if exists "documents_bucket_member_delete" on storage.objects;
create policy "documents_bucket_member_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
