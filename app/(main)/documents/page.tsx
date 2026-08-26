import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/app/actions/document-actions";
import { DocumentsClient } from "@/components/documents/DocumentsClient";

export const metadata = { title: "Documents" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams?: { doc?: string };
}) {
  const supabase = createClient();
  const userId = await getCurrentUserId().catch(() => null);

  // Founders and admins may delete any document (owners can always delete their own).
  let canDelete = false;
  if (userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.app_metadata?.role === "admin") {
      canDelete = true;
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_founder")
        .eq("id", userId)
        .maybeSingle();
      canDelete = profile?.is_founder ?? false;
    }
  }

  const { data: docs } = await supabase
    .from("documents")
    .select(
      `id, title, category, file_size, mime_type, uploaded_at, requires_signature,
       owner:profiles!documents_owner_id_fkey(id, full_name, avatar_url)`,
    )
    .order("uploaded_at", { ascending: false });

  // Team members — used by the "Send for signature" picker.
  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role_title")
    .order("full_name", { ascending: true });

  // Send-for-signature status (visible to requesters, signers, admins via RLS).
  // `signature` embeds the immutable signature row (typed name + hash) so the
  // UI can render the real, actual signature once someone signs.
  const { data: requests } = await supabase
    .from("document_requests")
    .select(
      `id, document_id, status, message, requested_at, signed_at,
       signer:profiles!document_requests_signer_id_fkey(id, full_name, avatar_url),
       signature:document_signatures!document_requests_signature_id_fkey(id, typed_name, signature_hash, signed_at)`,
    )
    .order("requested_at", { ascending: true });

  // The immutable signature trail — every real signature captured on each
  // document (typed name rendered in handwriting + hash). Direct signatures
  // exist even when no document_request row was created.
  const { data: signatures } = await supabase
    .from("document_signatures")
    .select(
      `id, document_id, signer_id, typed_name, signature_hash, signed_at,
       signer:profiles!document_signatures_signer_id_fkey(id, full_name, avatar_url)`,
    )
    .order("signed_at", { ascending: true });

  return (
    <DocumentsClient
      docs={
        docs?.map((d) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          file_size: d.file_size,
          mime_type: d.mime_type,
          uploaded_at: d.uploaded_at,
          requires_signature: d.requires_signature,
          owner: d.owner as unknown as { id: string; full_name: string | null; avatar_url: string | null } | null,
        })) ?? []
      }
      members={
        members?.map((m) => ({
          id: m.id,
          full_name: m.full_name,
          avatar_url: m.avatar_url,
          role_title: m.role_title,
        })) ?? []
      }
      requests={
        requests?.map((r) => ({
          id: r.id,
          document_id: r.document_id,
          status: r.status,
          requested_at: r.requested_at,
          signed_at: r.signed_at,
          signer: r.signer as unknown as { id: string; full_name: string | null; avatar_url: string | null } | null,
          signature:
            (r.signature as unknown as {
              id: string;
              typed_name: string | null;
              signature_hash: string | null;
              signed_at: string | null;
            } | null) ?? null,
        })) ?? []
      }
      mine={userId}
      canDelete={canDelete}
      initialDocId={searchParams?.doc ?? null}
      signatures={
        signatures?.map((s) => ({
          id: s.id,
          document_id: s.document_id,
          signer_id: s.signer_id,
          typed_name: s.typed_name,
          signature_hash: s.signature_hash,
          signed_at: s.signed_at,
          signer: s.signer as unknown as {
            id: string;
            full_name: string | null;
            avatar_url: string | null;
          } | null,
        })) ?? []
      }
    />
  );
}
