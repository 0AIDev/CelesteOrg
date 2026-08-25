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
      mine={userId}
    />
  );
}