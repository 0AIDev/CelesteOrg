import { createClient } from "@/lib/supabase/server";
import { GitHubFeed } from "@/components/github/GitHubFeed";

export const metadata = { title: "GitHub Activity" };

export default async function GitHubPage() {
  const supabase = createClient();

  const { data: events } = await supabase
    .from("github_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return <GitHubFeed initialEvents={(events as never[]) ?? []} />;
}
