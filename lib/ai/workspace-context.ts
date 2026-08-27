import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fetches real workspace data from Supabase and builds a context string
 * for the AI system prompt. Fast-fail with timeout.
 */
export async function getWorkspaceContext(userId: string): Promise<string> {
  try {
    return await Promise.race([
      fetchContext(userId),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);
  } catch {
    return "(Workspace data loading...)";
  }
}

async function fetchContext(userId: string): Promise<string> {
  const admin = createAdminClient();

  const [
    { data: profile },
    { data: teamMembers },
    { data: calendarEvents },
    { data: approvals },
    { data: documents },
    { data: dms },
    { data: notifs },
  ] = await Promise.all([
    admin.from("profiles").select("full_name, role_title").eq("id", userId).maybeSingle(),
    admin.from("profiles").select("full_name, role_title").limit(30),
    admin.from("calendar_events")
      .select("title, type, start_time")
      .gte("start_time", new Date().toISOString())
      .lte("start_time", new Date(Date.now() + 7 * 24 * 3600000).toISOString())
      .order("start_time").limit(10),
    admin.from("approvals")
      .select("summary, status, requester:profiles!approvals_requester_id_fkey(full_name)")
      .eq("status", "pending").order("created_at", { ascending: false }).limit(5),
    admin.from("documents")
      .select("title, category")
      .order("uploaded_at", { ascending: false }).limit(5),
    admin.from("direct_messages")
      .select("content, created_at, sender_id, sender:profiles!sender_id(full_name)")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false }).limit(10),
    admin.from("notifications")
      .select("title, body, read_at")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false }).limit(5),
  ]);

  const parts: string[] = [];

  if (profile) {
    parts.push(`User: ${profile.full_name} (${profile.role_title ?? "No role"})`);
  }

  if (teamMembers?.length) {
    parts.push(`Team: ${teamMembers.map((m: Record<string, unknown>) => `${m.full_name ?? "?"} (${m.role_title ?? "?"})`).join(", ")}`);
  }

  if (calendarEvents?.length) {
    parts.push(`Calendar: ${calendarEvents.map((e: Record<string, unknown>) => `${e.title} (${e.type})`).join(", ")}`);
  } else {
    parts.push("Calendar: No upcoming events");
  }

  if (approvals?.length) {
    parts.push(`Pending approvals: ${approvals.map((a: Record<string, unknown>) => {
      const r = a.requester as { full_name: string | null } | null;
      return `${a.summary} (from ${r?.full_name ?? "?"})`;
    }).join("; ")}`);
  } else {
    parts.push("Approvals: None pending");
  }

  if (documents?.length) {
    parts.push(`Documents: ${documents.map((d: Record<string, unknown>) => d.title).join(", ")}`);
  }

  if (dms?.length) {
    parts.push(`Recent DMs: ${dms.map((m: Record<string, unknown>) => {
      const s = m.sender as { full_name: string | null } | null;
      return `${s?.full_name ?? "?"}: ${String(m.content ?? "").slice(0, 80)}`;
    }).join("; ")}`);
  } else {
    parts.push("DMs: No recent messages");
  }

  if (notifs?.length) {
    parts.push(`Notifications: ${notifs.map((n: Record<string, unknown>) => `${n.title}${n.read_at ? "" : " (unread)"}`).join(", ")}`);
  }

  return parts.join("\n");
}
