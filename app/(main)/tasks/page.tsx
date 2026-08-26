import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { TaskBoard } from "@/components/tasks/TaskBoard";

export const metadata = { title: "Task Board" };

export default async function TasksPage() {
  const supabase = createClient();
  const user = await getUser().catch(() => null);

  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .order("full_name"),
  ]);

  return (
    <TaskBoard
      initialTasks={(tasks as never[]) ?? []}
      members={(members as { id: string; full_name: string | null; avatar_url: string | null }[]) ?? []}
      currentUserId={user?.id ?? null}
    />
  );
}
