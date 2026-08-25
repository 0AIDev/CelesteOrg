"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";

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

// Http-only client for RLS-aware reads.
async function currentUserId(): Promise<string | null> {
  const supabase = userClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// Auto-resolve a user's approver from the org chart.
// Person's manager = the profile holding the role that this person's role
// reports_to. Falls back to the highest-level founder/CEO if unset.
export async function resolveApprover(requesterId?: string): Promise<string | null> {
  const admin = createAdminClient();
  const id = requesterId ?? (await currentUserId());
  if (!id) return null;

  // Try the SQL helper that walks roles.reports_to.
  const { data, error } = await admin.rpc("resolve_manager", {
    p_profile_id: id,
  });
  if (!error && data) return data;

  // Fallback: CEO = the role at level 1 (top of tree) that is a founder.
  const { data: roles } = await admin
    .from("roles")
    .select("profile_id")
    .eq("level", 1)
    .limit(5)
    .order("created_at", { ascending: true });
  if (roles && roles.length > 0) return roles[0].profile_id;

  return null;
}

const createSchema = z.object({
  type: z.enum(["timeoff", "onboarding", "equity", "document", "onboarding_task", "general"]),
  targetId: z.string().optional(),
  summary: z.string().min(3, "A short summary is required").max(500),
});

export async function createApproval(
  input: Record<string, unknown>,
): Promise<ActionResult & { id?: string }> {
  try {
    const parsed = createSchema.parse(input);
    const requesterId = await currentUserId();
    if (!requesterId) return { ok: false, error: "Not authenticated" };

    const admin = createAdminClient();
    const approverId = await resolveApprover(requesterId);

    const { data, error } = await admin
      .from("approvals")
      .insert({
        requester_id: requesterId,
        approver_id: approverId,
        manager_id: approverId,
        type: parsed.type,
        target_id: parsed.targetId,
        summary: parsed.summary,
        status: "pending",
      })
      .select()
      .single();

    if (error) return { ok: false, error: error.message };

    if (approverId) {
      await notify(
        approverId,
        "approval",
        "New approval request",
        parsed.summary,
        data.id,
      );
    }

    revalidatePath("/dashboard");
    return { ok: true, id: data.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create approval";
    return { ok: false, error: msg };
  }
}

const reviewSchema = z.object({
  approvalId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().max(500).optional(),
});

// Approver reviews a pending request. The RLS policy gates this so only the
// assigned approver (or admin) can transition status.
export async function reviewApproval(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = reviewSchema.parse(input);
    const reviewerId = await currentUserId();
    if (!reviewerId) return { ok: false, error: "Not authenticated" };

    const supabase = userClient();
    const { data: approval, error: findErr } = await supabase
      .from("approvals")
      .select("id, requester_id, type, target_id, summary, approver_id")
      .eq("id", parsed.approvalId)
      .maybeSingle();
    if (findErr || !approval) return { ok: false, error: "Approval not found" };
    // Only the assigned approver can act (RLS enforces this too).
    if (approval.approver_id !== reviewerId) {
      return { ok: false, error: "Not your approval to review." };
    }

    const { error } = await supabase
      .from("approvals")
      .update({
        status: parsed.decision,
        comment: parsed.comment,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", parsed.approvalId);
    if (error) return { ok: false, error: error.message };

    const admin = createAdminClient();

    // Time-off: propagate the decision to the linked calendar event.
    if (approval.type === "timeoff" && approval.target_id) {
      await admin
        .from("calendar_events")
        .update({ status: parsed.decision === "approved" ? "approved" : "rejected" })
        .eq("id", approval.target_id);
      revalidatePath("/calendar");
    }

    await admin.from("audit_log").insert({
      actor_id: reviewerId,
      action: `approval.${parsed.decision}`,
      target_id: parsed.approvalId,
      meta: { comment: parsed.comment, type: approval.type },
    });

    await notify(
      approval.requester_id,
      "approval",
      `Request ${parsed.decision === "approved" ? "approved" : "rejected"}`,
      approval.summary,
      parsed.approvalId,
    );

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Review failed";
    return { ok: false, error: msg };
  }
}