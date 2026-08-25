import { createClient } from "@/lib/supabase/server";
import { IdeasClient } from "@/components/ideas/IdeasClient";

export const metadata = { title: "Ideas" };

export default async function IdeasPage({
  searchParams,
}: {
  searchParams?: { new?: string };
}) {
  const supabase = createClient();

  const { data: ideas } = await supabase
    .from("ideas")
    .select(
      `id, title, content, category, priority, status, ai_summary, created_at,
       author:profiles!ideas_author_id_fkey(id, full_name, avatar_url)`,
    )
    .order("created_at", { ascending: false });

  return (
    <IdeasClient
      initialOpen={searchParams?.new === "1"}
      ideas={
        ideas?.map((i) => ({
          id: i.id,
          title: i.title,
          content: i.content,
          category: i.category,
          priority: i.priority,
          status: i.status,
          ai_summary: i.ai_summary,
          created_at: i.created_at,
          author: i.author as unknown as { id: string; full_name: string | null; avatar_url: string | null } | null,
        })) ?? []
      }
    />
  );
}