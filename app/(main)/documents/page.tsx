import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/app/actions/document-actions";
import { DocumentsClient } from "@/components/documents/DocumentsClient";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const supabase = createClient();
  const userId = await getCurrentUserId().catch(() => null);

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
  const { data: requests } = await supabase
    .from("document_requests")
    .select(
      `id, document_id, status, message, requested_at, signed_at,
       signer:profiles!document_requests_signer_id_fkey(id, full_name, avatar_url)`,
    )
    .order("requested_at", { ascending: true });

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
        })) ?? []
      }
      mine={userId}
    />
  );
}
