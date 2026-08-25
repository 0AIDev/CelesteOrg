-- ============================================================================
-- 0010 — Send-for-signature workflow
-- ----------------------------------------------------------------------------
-- Adds a per-signer request row so a document can be sent to specific people,
-- tracked as pending → signed, with notifications. The immutable audit trail
-- (document_signatures) stays untouched; requests reference it once signed.
-- ============================================================================

create table if not exists public.document_requests (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  signer_id    uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'signed', 'revoked')),
  message      text,
  requested_at timestamptz not null default now(),
  signed_at    timestamptz,
  signature_id uuid references public.document_signatures(id) on delete set null,
  unique (document_id, signer_id)
);

create index if not exists idx_doc_req_doc    on public.document_requests(document_id);
create index if not exists idx_doc_req_signer on public.document_requests(signer_id);
create index if not exists idx_doc_req_status on public.document_requests(status);

alter table public.document_requests enable row level security;

-- Anyone who is a signer on a request, the requester, or an admin can see it.
create policy "doc_req_select" on public.document_requests
  for select to authenticated
  using (
    public.is_admin()
    or signer_id = public.current_user_id()
    or requested_by = public.current_user_id()
  );

-- Only the document owner (or admin) can create signature requests.
create policy "doc_req_insert_owner" on public.document_requests
  for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.documents d
      where d.id = document_id and d.owner_id = public.current_user_id()
    )
  );

-- Requester (or admin) can update — e.g. revoke a pending request.
-- Signers flip their own row to 'signed' through the server action
-- (admin client), not through this policy.
create policy "doc_req_update_requester" on public.document_requests
  for update to authenticated
  using (public.is_admin() or requested_by = public.current_user_id())
  with check (public.is_admin() or requested_by = public.current_user_id());

-- Signers need to see documents that were sent to them for signature,
-- otherwise the send-for-signature flow is invisible to them.
drop policy if exists "docs_owner_select" on public.documents;
create policy "docs_owner_select" on public.documents
  for select to authenticated
  using (
    owner_id = public.current_user_id()
    or public.is_admin()
    or exists (
      select 1 from public.document_requests r
      where r.document_id = documents.id
        and r.signer_id = public.current_user_id()
    )
  );

grant select, insert, update, delete on public.document_requests to authenticated;
