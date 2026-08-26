"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type ActionResult = { ok: true } | { ok: false; error: string };

function userClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );
}

// ── Types ───────────────────────────────────────────────────────────────────
export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_id: string | null;
  due_date: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  assignee?: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

// ── Read ────────────────────────────────────────────────────────────────────
export async function getTasks(): Promise<ActionResult & { tasks?: TaskRow[] }> {
  try {
    const supabase = userClient();
    const { data, error } = await supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) return { ok: false, error: error.message };
    return { ok: true, tasks: (data as TaskRow[]) ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Load failed" };
  }
}

// ── Create ──────────────────────────────────────────────────────────────────
export async function createTask(input: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: string | null;
  due_date?: string | null;
}): Promise<ActionResult & { id?: string }> {
  try {
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const status = input.status ?? "backlog";

    // Get max position for the target column
    const { data: maxPos } = await supabase
      .from("tasks")
      .select("position")
      .eq("status", status)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        status,
        priority: input.priority ?? "medium",
        assignee_id: input.assignee_id ?? null,
        due_date: input.due_date ?? null,
        position: (maxPos?.position ?? 0) + 1,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/tasks");
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Create failed" };
  }
}

// ── Update status (drag-and-drop) ───────────────────────────────────────────
export async function moveTask(
  taskId: string,
  newStatus: string,
  newPosition: number,
): Promise<ActionResult> {
  try {
    const supabase = userClient();
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus, position: newPosition, updated_at: new Date().toISOString() })
      .eq("id", taskId);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/tasks");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Move failed" };
  }
}

// ── Reorder within a column ─────────────────────────────────────────────────
export async function reorderTasks(
  updates: { id: string; position: number }[],
): Promise<ActionResult> {
  try {
    const supabase = userClient();
    for (const u of updates) {
      await supabase
        .from("tasks")
        .update({ position: u.position, updated_at: new Date().toISOString() })
        .eq("id", u.id);
    }
    revalidatePath("/tasks");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Reorder failed" };
  }
}

// ── Update fields ───────────────────────────────────────────────────────────
export async function updateTask(
  taskId: string,
  fields: {
    title?: string;
    description?: string;
    priority?: string;
    assignee_id?: string | null;
    due_date?: string | null;
  },
): Promise<ActionResult> {
  try {
    const supabase = userClient();
    const { error } = await supabase
      .from("tasks")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", taskId);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/tasks");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}

// ── Delete ──────────────────────────────────────────────────────────────────
export async function deleteTask(taskId: string): Promise<ActionResult> {
  try {
    const supabase = userClient();
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tasks");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}
