import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fetches real workspace data from Supabase and builds a context string
 * for the AI system prompt. This gives the AI actual knowledge of the
 * team's workspace state.
 */
export async function getWorkspaceContext(userId: string): Promise<string> {
  const admin = createAdminClient();

  const [
    { data: profile },
    { data: teamMembers },
    { data: calendarEvents },
    { data: approvals },
    { data: documents },
    { data: reports },
    { data: ideas },
    { data: tasks },
    { data: issues },
    { data: githubEvents },
  ] = await Promise.all([
    // Current user profile
    admin.from("profiles").select("full_name, role_title, department_id, location").eq("id", userId).maybeSingle(),

    // Team members
    admin.from("profiles").select("full_name, role_title, department_id").limit(50),

    // Upcoming calendar events (next 7 days)
    admin.from("calendar_events")
      .select("title, type, start_time, end_time, attendees")
      .gte("start_time", new Date().toISOString())
      .lte("start_time", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("start_time", { ascending: true })
      .limit(20),

    // Pending approvals
    admin.from("approvals")
      .select("summary, status, priority, created_at, requester:profiles!approvals_requester_id_fkey(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),

    // Recent documents
    admin.from("documents")
      .select("title, category, uploaded_at, requires_signature, status")
      .order("uploaded_at", { ascending: false })
      .limit(10),

    // Recent standup reports
    admin.from("daily_reports")
      .select("date, morning_plan, eod_summary, blockers, user_id, profiles!daily_reports_user_id_fkey(full_name)")
      .order("date", { ascending: false })
      .limit(10),

    // Recent ideas
    admin.from("ideas")
      .select("title, status, created_at, author:profiles!ideas_author_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(10),

    // Open tasks
    admin.from("tasks")
      .select("title, status, priority, assignee:profiles!tasks_assignee_id_fkey(full_name)")
      .in("status", ["backlog", "in_progress", "in_review"])
      .order("created_at", { ascending: false })
      .limit(15),

    // Open issues
    admin.from("issues")
      .select("title, status, priority, project_track")
      .in("status", ["backlog", "todo", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(10),

    // Recent GitHub events
    admin.from("github_events")
      .select("event_type, repository, sender, ai_summary, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const parts: string[] = [];

  // ── Current user ────────────────────────────────────────────────────
  if (profile) {
    parts.push(`## Current User\nName: ${profile.full_name}\nRole: ${profile.role_title ?? "Not set"}\nLocation: ${profile.location ?? "Not set"}`);
  }

  // ── Team members ────────────────────────────────────────────────────
  if (teamMembers && teamMembers.length > 0) {
    const memberList = teamMembers
      .map((m: { full_name: string | null; role_title: string | null }) => `- ${m.full_name ?? "Unknown"} (${m.role_title ?? "No role"})`)
      .join("\n");
    parts.push(`## Team Members (${teamMembers.length})\n${memberList}`);
  }

  // ── Calendar events (next 7 days) ───────────────────────────────────
  if (calendarEvents && calendarEvents.length > 0) {
    const eventList = calendarEvents
      .map((e: { title: string; type: string; start_time: string; end_time: string | null }) => {
        const start = new Date(e.start_time);
        const timeStr = start.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        return `- ${e.title} (${e.type}) — ${timeStr}`;
      })
      .join("\n");
    parts.push(`## Upcoming Calendar Events (next 7 days)\n${eventList}`);
  } else {
    parts.push("## Calendar Events\nNo upcoming events in the next 7 days.");
  }

  // ── Pending approvals ───────────────────────────────────────────────
  if (approvals && approvals.length > 0) {
    const approvalList = approvals
      .map((a: { summary: string; priority: string; requester: { full_name: string | null } | { full_name: string | null }[] | null }) => {
        const requesterName = Array.isArray(a.requester) ? a.requester[0]?.full_name : (a.requester as { full_name: string | null } | null)?.full_name;
        return `- ${a.summary} (priority: ${a.priority}) — requested by ${requesterName ?? "Unknown"}`;
      })
      .join("\n");
    parts.push(`## Pending Approvals (${approvals.length})\n${approvalList}`);
  } else {
    parts.push("## Approvals\nNo pending approvals.");
  }

  // ── Recent documents ────────────────────────────────────────────────
  if (documents && documents.length > 0) {
    const docList = documents
      .map((d: { title: string; category: string | null; requires_signature: boolean; status: string | null }) => {
        const tags = [d.category, d.requires_signature ? "needs signature" : null, d.status].filter(Boolean).join(", ");
        return `- ${d.title}${tags ? ` (${tags})` : ""}`;
      })
      .join("\n");
    parts.push(`## Recent Documents\n${docList}`);
  }

  // ── Standup reports ─────────────────────────────────────────────────
  if (reports && reports.length > 0) {
    const reportList = reports
      .map((r: { date: string; morning_plan: string | null; eod_summary: string | null; blockers: string | null; profiles: { full_name: string | null } | { full_name: string | null }[] | null }) => {
        const name = Array.isArray(r.profiles) ? r.profiles[0]?.full_name : (r.profiles as { full_name: string | null } | null)?.full_name;
        const parts2: string[] = [];
        if (r.morning_plan) parts2.push(`plan: ${r.morning_plan}`);
        if (r.eod_summary) parts2.push(`summary: ${r.eod_summary}`);
        if (r.blockers) parts2.push(`⚠️ blocker: ${r.blockers}`);
        return `- ${name ?? "Unknown"} (${r.date}): ${parts2.join(" | ") || "No details"}`;
      })
      .join("\n");
    parts.push(`## Recent Standup Reports\n${reportList}`);
  }

  // ── Ideas ───────────────────────────────────────────────────────────
  if (ideas && ideas.length > 0) {
    const ideaList = ideas
      .map((i: { title: string; status: string; author: { full_name: string | null } | { full_name: string | null }[] | null }) => {
        const authorName = Array.isArray(i.author) ? i.author[0]?.full_name : (i.author as { full_name: string | null } | null)?.full_name;
        return `- ${i.title} [${i.status}] — by ${authorName ?? "Unknown"}`;
      })
      .join("\n");
    parts.push(`## Recent Ideas\n${ideaList}`);
  }

  // ── Tasks ───────────────────────────────────────────────────────────
  if (tasks && tasks.length > 0) {
    const taskList = tasks
      .map((t: { title: string; status: string; priority: string; assignee: { full_name: string | null } | { full_name: string | null }[] | null }) => {
        const assigneeName = Array.isArray(t.assignee) ? t.assignee[0]?.full_name : (t.assignee as { full_name: string | null } | null)?.full_name;
        return `- ${t.title} [${t.status}] priority: ${t.priority}${assigneeName ? ` → ${assigneeName}` : ""}`;
      })
      .join("\n");
    parts.push(`## Open Tasks\n${taskList}`);
  }

  // ── Issues ──────────────────────────────────────────────────────────
  if (issues && issues.length > 0) {
    const issueList = issues
      .map((i: { title: string; status: string; priority: string; project_track: string | null }) => {
        return `- ${i.title} [${i.status}] priority: ${i.priority}${i.project_track ? ` (${i.project_track})` : ""}`;
      })
      .join("\n");
    parts.push(`## Open Issues\n${issueList}`);
  }

  // ── GitHub activity ─────────────────────────────────────────────────
  if (githubEvents && githubEvents.length > 0) {
    const ghList = githubEvents
      .map((e: { event_type: string; repository: string | null; ai_summary: string | null; created_at: string }) => {
        const time = new Date(e.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        return `- ${e.event_type} on ${e.repository ?? "repo"} (${time})${e.ai_summary ? `: ${e.ai_summary}` : ""}`;
      })
      .join("\n");
    parts.push(`## Recent GitHub Activity\n${ghList}`);
  }

  return parts.join("\n\n");
}
