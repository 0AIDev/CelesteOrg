"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { resolveApprover } from "@/app/actions/approval-actions";

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

async function currentUserId(): Promise<string | null> {
  const supabase = userClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function isAdminOrFounder(): Promise<boolean> {
  const id = await currentUserId();
  if (!id) return false;
  const supabase = userClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.app_metadata?.role === "admin") return true;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_founder")
    .eq("id", id)
    .maybeSingle();
  return profile?.is_founder === true;
}

const statusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(["pending", "in_progress", "done", "blocked"]),
});

// Only the task owner (or admin) can update their checklist.
export async function updateTaskStatus(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = statusSchema.parse(input);
    const userId = await currentUserId();
    if (!userId) return { ok: false, error: "Not authenticated" };

    const supabase = userClient();
    const { error } = await supabase
      .from("onboarding_tasks")
      .update({ status: parsed.status })
      .eq("id", parsed.taskId)
      .eq("user_id", userId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/onboarding");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update task";
    return { ok: false, error: msg };
  }
}

// When a task is marked done, the owner submits it for manager approval.
export async function submitTaskForApproval(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = statusSchema.parse({ ...input, status: "done" });
    const userId = await currentUserId();
    if (!userId) return { ok: false, error: "Not authenticated" };

    const admin = createAdminClient();
    const { data: task } = await admin
      .from("onboarding_tasks")
      .select("id, title, user_id")
      .eq("id", parsed.taskId)
      .maybeSingle();
    if (!task || task.user_id !== userId) return { ok: false, error: "Task not found" };

    // Mark done first (owner check via user client), then open an approval.
    const supabase = userClient();
    const { error: upErr } = await supabase
      .from("onboarding_tasks")
      .update({ status: "done" })
      .eq("id", parsed.taskId)
      .eq("user_id", userId);
    if (upErr) return { ok: false, error: upErr.message };

    const approverId = await resolveApprover(userId);
    const { data: approval } = await admin
      .from("task_approvals")
      .insert({
        task_id: parsed.taskId,
        approver_id: approverId,
        status: "pending",
      })
      .select("id")
      .single();

    if (approverId) {
      await notify(
        approverId,
        "approval",
        "Onboarding task to approve",
        task.title,
        approval?.id,
      );
    }

    revalidatePath("/onboarding");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not submit task";
    return { ok: false, error: msg };
  }
}

const reviewSchema = z.object({
  taskApprovalId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().max(500).optional(),
});

export async function reviewTaskApproval(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = reviewSchema.parse(input);
    const reviewerId = await currentUserId();
    if (!reviewerId) return { ok: false, error: "Not authenticated" };

    const admin = createAdminClient();
    const { data: ta } = await admin
      .from("task_approvals")
      .select("id, task_id, approver_id")
      .eq("id", parsed.taskApprovalId)
      .maybeSingle();
    if (!ta) return { ok: false, error: "Approval not found" };
    if (ta.approver_id !== reviewerId) {
      return { ok: false, error: "Not your task to approve." };
    }

    const { error: upErr } = await admin
      .from("task_approvals")
      .update({
        status: parsed.decision,
        comment: parsed.comment,
      })
      .eq("id", parsed.taskApprovalId);
    if (upErr) return { ok: false, error: upErr.message };

    await admin.from("audit_log").insert({
      actor_id: reviewerId,
      action: `onboarding_task.${parsed.decision}`,
      target_id: ta.task_id,
      meta: { comment: parsed.comment },
    });

    revalidatePath("/onboarding");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not review task";
    return { ok: false, error: msg };
  }
}

const assignSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  category: z.string().max(80).optional(),
  dueDate: z.string().date().optional(),
});

// Admins/founders assign onboarding tasks to teammates.
export async function assignTask(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    if (!(await isAdminOrFounder())) {
      return { ok: false, error: "Only founders and admins can assign tasks." };
    }
    const parsed = assignSchema.parse(input);
    const admin = createAdminClient();
    const { error } = await admin.from("onboarding_tasks").insert({
      user_id: parsed.userId,
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
      due_date: parsed.dueDate,
      status: "pending",
      assigned_by: await currentUserId(),
    });
    if (error) return { ok: false, error: error.message };

    await notify(
      parsed.userId,
      "system",
      "New onboarding task",
      parsed.title,
    );

    revalidatePath("/onboarding");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not assign task";
    return { ok: false, error: msg };
  }
}