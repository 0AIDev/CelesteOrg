import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { RecordingsLibrary } from "@/components/recordings/RecordingsLibrary";

export const metadata = { title: "Recordings" };

export default async function RecordingsPage() {
  const supabase = createClient();
  const user = await getUser().catch(() => null);

  const { data: recordings } = await supabase
    .from("screen_recordings")
    .select("*, author:profiles!screen_recordings_author_id_fkey(full_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <RecordingsLibrary
      initialRecordings={(recordings as never[]) ?? []}
      currentUserId={user?.id ?? null}
    />
  );
}
