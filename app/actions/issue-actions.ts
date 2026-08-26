"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ───────────────────────────────────────────────────────────────────

export type IssueStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";
export type IssuePriority = "low" | "medium" | "high" | "urgent";
export type ProjectTrack = "Core AI" | "Frontend" | "Infrastructure" | "Design" | "General";

export type Issue = {
  id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  project_track: string;
  assignee_id: string | null;
  creator_id: string | null;
  labels: string[];
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  // joined
  assignee_name?: string;
  assignee_avatar?: string | null;
  creator_name?: string;
  comment_count?: number;
};

export type IssueComment = {
  id: string;
  issue_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
};

const STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const PRIORITY_LABELS: Record<IssuePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const TRACK_LABELS: Record<string, string> = {
  "Core AI": "Core AI",
  Frontend: "Frontend",
  Infrastructure: "Infrastructure",
  Design: "Design",
  General: "General",
};

export { STATUS_LABELS, PRIORITY_LABELS, TRACK_LABELS };

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getIssues(filters?: {
  status?: IssueStatus;
  priority?: IssuePriority;
  project_track?: string;
  assignee_id?: string;
}): Promise<Issue[]> {
  const sb = await createClient();
  let query = sb
    .from("issues")
    .select(`
      *,
      assignee:profiles!assignee_id(full_name, avatar_url),
      creator:profiles!creator_id(full_name),
      issue_comments(id)
    `)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.priority) query = query.eq("priority", filters.priority);
  if (filters?.project_track) query = query.eq("project_track", filters.project_track);
  if (filters?.assignee_id) query = query.eq("assignee_id", filters.assignee_id);

  const { data, error } = await query;
  if (error) {
    console.error("[issues] getIssues:", error.message);
    return [];
  }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as Omit<Issue, "assignee_name" | "assignee_avatar" | "creator_name" | "comment_count">),
    assignee_name: (r.assignee as Record<string, unknown>)?.full_name as string ?? null,
    assignee_avatar: (r.assignee as Record<string, unknown>)?.avatar_url as string ?? null,
    creator_name: (r.creator as Record<string, unknown>)?.full_name as string ?? "Unknown",
    comment_count: Array.isArray(r.issue_comments) ? r.issue_comments.length : 0,
  })) as Issue[];
}

export async function getIssueById(id: string): Promise<Issue | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("issues")
    .select(`
      *,
      assignee:profiles!assignee_id(full_name, avatar_url),
      creator:profiles!creator_id(full_name),
      issue_comments(id)
    `)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  return {
    ...(r as Omit<Issue, "assignee_name" | "assignee_avatar" | "creator_name" | "comment_count">),
    assignee_name: (r.assignee as Record<string, unknown>)?.full_name as string ?? null,
    assignee_avatar: (r.assignee as Record<string, unknown>)?.avatar_url as string ?? null,
    creator_name: (r.creator as Record<string, unknown>)?.full_name as string ?? "Unknown",
    comment_count: Array.isArray(r.issue_comments) ? r.issue_comments.length : 0,
  } as Issue;
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createIssue(input: {
  title: string;
  description?: string;
  priority?: IssuePriority;
  project_track?: string;
  assignee_id?: string;
}): Promise<{ ok: boolean; issue?: Issue; error?: string }> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Get max position for backlog
  const { data: maxPos } = await sb
    .from("issues")
    .select("position")
    .eq("status", "backlog")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await sb
    .from("issues")
    .insert({
      title: input.title,
      description: input.description || null,
      priority: input.priority || "medium",
      project_track: input.project_track || "General",
      assignee_id: input.assignee_id || null,
      creator_id: user.id,
      position: ((maxPos?.position as number) ?? 0) + 1,
    })
    .select("*, assignee:profiles!assignee_id(full_name, avatar_url), creator:profiles!creator_id(full_name)")
    .single();

  if (error) return { ok: false, error: error.message };

  const r = data as Record<string, unknown>;
  revalidatePath("/issues");
  return {
    ok: true,
    issue: {
      ...(r as Omit<Issue, "assignee_name" | "assignee_avatar" | "creator_name" | "comment_count">),
      assignee_name: (r.assignee as Record<string, unknown>)?.full_name as string ?? null,
      assignee_avatar: (r.assignee as Record<string, unknown>)?.avatar_url as string ?? null,
      creator_name: (r.creator as Record<string, unknown>)?.full_name as string ?? "Unknown",
      comment_count: 0,
    } as Issue,
  };
}

export async function updateIssue(
  id: string,
  changes: {
    title?: string;
    description?: string | null;
    status?: IssueStatus;
    priority?: IssuePriority;
    project_track?: string;
    assignee_id?: string | null;
    position?: number;
    due_date?: string | null;
    labels?: string[];
  },
): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { error } = await sb.from("issues").update(changes).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/issues");
  return { ok: true };
}

export async function moveIssue(
  id: string,
  newStatus: IssueStatus,
  newPosition: number,
): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { error } = await sb
    .from("issues")
    .update({ status: newStatus, position: newPosition })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteIssue(id: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { error } = await sb.from("issues").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/issues");
  return { ok: true };
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function getComments(issueId: string): Promise<IssueComment[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("issue_comments")
    .select("*, author:profiles!author_id(full_name, avatar_url)")
    .eq("issue_id", issueId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as Omit<IssueComment, "author_name" | "author_avatar">),
    author_name: (r.author as Record<string, unknown>)?.full_name as string ?? "Unknown",
    author_avatar: (r.author as Record<string, unknown>)?.avatar_url as string ?? null,
  })) as IssueComment[];
}

export async function addComment(
  issueId: string,
  content: string,
): Promise<{ ok: boolean; comment?: IssueComment; error?: string }> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data, error } = await sb
    .from("issue_comments")
    .insert({ issue_id: issueId, author_id: user.id, content })
    .select("*, author:profiles!author_id(full_name, avatar_url)")
    .single();

  if (error) return { ok: false, error: error.message };
  const r = data as Record<string, unknown>;
  return {
    ok: true,
    comment: {
      ...(r as Omit<IssueComment, "author_name" | "author_avatar">),
      author_name: (r.author as Record<string, unknown>)?.full_name as string ?? "You",
      author_avatar: (r.author as Record<string, unknown>)?.avatar_url as string ?? null,
    } as IssueComment,
  };
}

// ─── Team Members (for assignee picker) ──────────────────────────────────────

export async function getTeamMembers(): Promise<{ id: string; full_name: string; avatar_url: string | null }[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("profiles")
    .select("id, full_name, avatar_url")
    .order("full_name");

  if (error) return [];
  return (data ?? []) as { id: string; full_name: string; avatar_url: string | null }[];
}
