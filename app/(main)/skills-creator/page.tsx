import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { SkillsCreator } from "@/components/skills-creator/SkillsCreator";

export const metadata = { title: "Skills Creator" };

export default async function SkillsCreatorPage() {
  const supabase = createClient();
  const user = await getUser().catch(() => null);

  const { data: skills } = await supabase
    .from("skills")
    .select(
      "*, author:profiles!skills_author_id_fkey(full_name, avatar_url)",
    )
    .order("upvotes", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <SkillsCreator
      initialSkills={(skills as never[]) ?? []}
      currentUserId={user?.id ?? null}
    />
  );
}
