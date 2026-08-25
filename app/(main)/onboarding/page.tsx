import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";

export const metadata = { title: "Onboarding" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { welcome?: string };
}) {
  const supabase = createClient();
  const profile = await getProfile().catch(() => null);
  const myId = profile?.id ?? "";

  const [{ data: myTasks }, { data: toApprove }, { data: teammates }] =
    await Promise.all([
      supabase
        .from("onboarding_tasks")
        .select("id, title, description, category, status, due_date")
        .eq("user_id", myId)
        .order("created_at", { ascending: true }),
      supabase
        .from("task_approvals")
        .select(
          `id, status, comment, created_at,
           task:onboarding_tasks!task_approvals_task_id_fkey(id, title, category, user_id)`,
        )
        .eq("approver_id", myId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("profiles").select("id, full_name").order("full_name"),
    ]);

  return (
    <OnboardingClient
      myId={myId}
      isAdmin={profile ? profile.is_founder || false : false}
      welcome={searchParams?.welcome === "1"}
      profile={
        profile
          ? {
              full_name: profile.full_name,
              role_title: profile.role_title,
              department_id: profile.department_id,
              bio: profile.bio,
              location: profile.location,
              previous_companies: profile.previous_companies,
            }
          : null
      }
      tasks={
        myTasks?.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          category: t.category,
          status: t.status,
          due_date: t.due_date,
        })) ?? []
      }
      toApprove={
        toApprove?.map((a) => ({
          id: a.id,
          status: a.status,
          comment: a.comment,
          created_at: a.created_at,
          task: a.task as unknown as { id: string; title: string; category: string | null; user_id: string },
        })) ?? []
      }
      teammates={
        teammates?.map((t) => ({ id: t.id, full_name: t.full_name })) ?? []
      }
    />
  );
}