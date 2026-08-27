import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  let requestQuery = supabase
    .from("notion_pages_cache")
    .select("id, notion_page_id, title, url, parent_type, last_edited_time, content_snippet, vector_indexed, created_at")
    .order("last_edited_time", { ascending: false, nullsFirst: false });

  if (query) {
    requestQuery = requestQuery.or(`title.ilike.%${query}%,content_snippet.ilike.%${query}%`);
  }

  const { data, error } = await requestQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pages: data ?? [] });
}
