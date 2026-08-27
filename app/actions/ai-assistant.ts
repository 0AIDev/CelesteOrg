"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserId } from "./document-actions";

type Answer = { ok: true; answer: string; actions?: string[] } | { ok: false; error: string };

// ── Tools the AI can call ─────────────────────────────────────────────────
const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_calendar_today",
      description: "Get today's calendar events for the team",
      parameters: { type: "object" as const, properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_pending_approvals",
      description: "Get pending approvals for the current user",
      parameters: { type: "object" as const, properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_team_members",
      description: "List all team members with their roles",
      parameters: { type: "object" as const, properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_recent_documents",
      description: "Get recently uploaded documents",
      parameters: { type: "object" as const, properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_calendar_event",
      description: "Create a calendar event (meeting, vacation, remote, sick)",
      parameters: {
        type: "object" as const,
        properties: {
          title: { type: "string", description: "Event title" },
          type: { type: "string", enum: ["meeting", "vacation", "remote", "sick"], description: "Event type" },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          start_time: { type: "string", description: "Start time in HH:MM format (24h)" },
          end_time: { type: "string", description: "End time in HH:MM format (24h)" },
        },
        required: ["title", "type", "date"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_idea",
      description: "Submit a new idea to the idea vault",
      parameters: {
        type: "object" as const,
        properties: {
          title: { type: "string", description: "Idea title" },
          content: { type: "string", description: "Detailed description" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Priority level" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "invite_teammate",
      description: "Send an invite to a new team member",
      parameters: {
        type: "object" as const,
        properties: {
          email: { type: "string", description: "Email address to invite" },
          role_title: { type: "string", description: "Position/role title" },
        },
        required: ["email", "role_title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "approve_request",
      description: "Approve a pending approval request",
      parameters: {
        type: "object" as const,
        properties: {
          summary_keyword: { type: "string", description: "A keyword to match the approval to approve" },
        },
        required: ["summary_keyword"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_equity_summary",
      description: "Get cap table / equity summary",
      parameters: { type: "object" as const, properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_chat_messages",
      description: "Get recent messages from a chat channel",
      parameters: {
        type: "object" as const,
        properties: {
          channel_name: { type: "string", description: "Channel name (e.g. 'general', 'engineering')" },
        },
        required: ["channel_name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_dm_messages",
      description: "Get recent direct messages with a specific person",
      parameters: {
        type: "object" as const,
        properties: {
          peer_name: { type: "string", description: "Name of the person" },
        },
        required: ["peer_name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_notifications",
      description: "Get recent notifications for the current user",
      parameters: { type: "object" as const, properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_ideas",
      description: "Get ideas from the idea vault",
      parameters: { type: "object" as const, properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_issues",
      description: "Get tracked issues and their status",
      parameters: { type: "object" as const, properties: {} },
    },
  },
];

// ── Tool executors ────────────────────────────────────────────────────────
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const admin = createAdminClient();
  const today = new Date();

  switch (name) {
    case "get_calendar_today": {
      const { data } = await admin
        .from("calendar_events")
        .select("title, type, start_time, end_time, user:profiles!calendar_events_user_id_fkey(full_name)")
        .gte("start_time", today.toISOString())
        .lte("start_time", new Date(today.getTime() + 24 * 3600000).toISOString())
        .order("start_time");
      if (!data?.length) return "No events scheduled today.";
      return data.map((e: Record<string, unknown>) => {
        const user = e.user as { full_name: string | null } | null;
        const t = new Date(e.start_time as string);
        return `- ${t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${e.title} (${e.type}) — ${user?.full_name ?? "unknown"}`;
      }).join("\n");
    }

    case "get_pending_approvals": {
      const { data } = await admin
        .from("approvals")
        .select("id, summary, type, requester:profiles!approvals_requester_id_fkey(full_name), created_at")
        .eq("approver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (!data?.length) return "No pending approvals. You're all caught up!";
      return data.map((a: Record<string, unknown>) => {
        const req = a.requester as { full_name: string | null } | null;
        return `- ${a.summary} (from ${req?.full_name ?? "unknown"}, ${new Date(a.created_at as string).toLocaleDateString()})`;
      }).join("\n");
    }

    case "get_team_members": {
      const { data } = await admin
        .from("profiles")
        .select("full_name, role_title, is_founder, is_admin")
        .order("full_name");
      if (!data?.length) return "No team members found.";
      return data.map((m: Record<string, unknown>) => {
        const badges = [];
        if (m.is_founder) badges.push("founder");
        if (m.is_admin) badges.push("admin");
        return `- ${m.full_name}${m.role_title ? ` — ${m.role_title}` : ""}${badges.length ? ` [${badges.join(", ")}]` : ""}`;
      }).join("\n");
    }

    case "get_recent_documents": {
      const { data } = await admin
        .from("documents")
        .select("title, category, uploaded_at, owner:profiles!documents_owner_id_fkey(full_name)")
        .order("uploaded_at", { ascending: false })
        .limit(10);
      if (!data?.length) return "No documents uploaded yet.";
      return data.map((d: Record<string, unknown>) => {
        const owner = d.owner as { full_name: string | null } | null;
        return `- ${d.title} (${d.category ?? "General"}, by ${owner?.full_name ?? "unknown"}, ${new Date(d.uploaded_at as string).toLocaleDateString()})`;
      }).join("\n");
    }

    case "create_calendar_event": {
      const title = args.title as string;
      const type = (args.type as string) || "meeting";
      const date = (args.date as string) || today.toISOString().slice(0, 10);
      const startTime = (args.start_time as string) || "10:00";
      const endTime = (args.end_time as string) || "11:00";
      const startISO = new Date(`${date}T${startTime}:00`).toISOString();
      const endISO = new Date(`${date}T${endTime}:00`).toISOString();

      const { data, error } = await admin
        .from("calendar_events")
        .insert({ title, type, start_time: startISO, end_time: endISO, user_id: userId, status: type === "meeting" ? "approved" : "pending" })
        .select("id")
        .single();
      if (error) return `Failed to create event: ${error.message}`;
      return `✅ Created "${title}" (${type}) on ${date} from ${startTime} to ${endTime}.`;
    }

    case "create_idea": {
      const title = args.title as string;
      const content = (args.content as string) || "";
      const priority = (args.priority as string) || "medium";
      const { error } = await admin.from("ideas").insert({ title, content, priority, author_id: userId, status: "new" });
      if (error) return `Failed to create idea: ${error.message}`;
      return `✅ Idea "${title}" added to the vault (priority: ${priority}).`;
    }

    case "invite_teammate": {
      const email = args.email as string;
      const roleTitle = args.role_title as string;
      const { data: invite, error } = await admin
        .from("invites")
        .insert({ email, role_title: roleTitle, invited_by: userId })
        .select("id")
        .single();
      if (error) return `Failed to send invite: ${error.message}`;
      return `✅ Invite sent to ${email} for the role "${roleTitle}". They'll receive a magic link.`;
    }

    case "approve_request": {
      const keyword = (args.summary_keyword as string).toLowerCase();
      const { data: approvals } = await admin
        .from("approvals")
        .select("id, summary")
        .eq("approver_id", userId)
        .eq("status", "pending");
      const match = approvals?.find((a: { summary: string }) => a.summary.toLowerCase().includes(keyword));
      if (!match) return `No pending approval matching "${keyword}". Check /approvals for the full list.`;
      const { error } = await admin
        .from("approvals")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", match.id);
      if (error) return `Failed to approve: ${error.message}`;
      return `✅ Approved: "${match.summary}".`;
    }

    case "get_equity_summary": {
      const { data } = await admin
        .from("equity_grants")
        .select("total_shares, vested_shares, user:profiles!equity_grants_user_id_fkey(full_name)");
      if (!data?.length) return "No equity grants issued yet.";
      const totalShares = data.reduce((s: number, g: Record<string, unknown>) => s + Number(g.total_shares || 0), 0);
      const totalVested = data.reduce((s: number, g: Record<string, unknown>) => s + Number(g.vested_shares || 0), 0);
      const holders = data.map((g: Record<string, unknown>) => {
        const user = g.user as { full_name: string | null } | null;
        return `- ${user?.full_name ?? "Unknown"}: ${g.total_shares} shares (${g.vested_shares} vested)`;
      }).join("\n");
      return `Cap table (${data.length} grants):\n${holders}\n\nTotal: ${totalShares} shares, ${totalVested} vested.`;
    }

    case "get_chat_messages": {
      const channelName = (args.channel_name as string) || "general";
      const { data: ch } = await admin.from("channels").select("id").ilike("name", channelName).maybeSingle();
      if (!ch) return `Channel #${channelName} not found.`;
      const { data: msgs } = await admin
        .from("chat_messages")
        .select("content, created_at, sender:profiles!sender_id(full_name)")
        .eq("channel_id", ch.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!msgs?.length) return `No messages in #${channelName}.`;
      return msgs.reverse().map((m: Record<string, unknown>) => {
        const s = m.sender as { full_name: string | null } | null;
        const t = new Date(m.created_at as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return `[${t}] ${s?.full_name ?? "?"}: ${m.content}`;
      }).join("\n");
    }

    case "get_dm_messages": {
      const peerName = (args.peer_name as string) || "";
      const { data: peers } = await admin.from("profiles").select("id, full_name").ilike("full_name", "%" + peerName + "%").limit(5);
      if (!peers?.length) return "No person matching '" + peerName + "' found.";
      const peer = peers[0];
      const orFilter = "and(sender_id.eq." + userId + ",receiver_id.eq." + peer.id + "),and(sender_id.eq." + peer.id + ",receiver_id.eq." + userId + ")";
      const { data: msgs } = await admin
        .from("direct_messages")
        .select("content, created_at, sender:profiles!sender_id(full_name)")
        .or(orFilter)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!msgs?.length) return "No DMs with " + (peer.full_name ?? "unknown") + ".";
      const peerDisplayName = peer.full_name ?? "unknown";
      const lines = msgs.reverse().map((m: Record<string, unknown>) => {
        const s = m.sender as { full_name: string | null } | null;
        const t = new Date(m.created_at as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return "[" + t + "] " + (s?.full_name ?? "?") + ": " + m.content;
      }).join("\n");
      return "Messages with " + peerDisplayName + ":\n" + lines;
    }

    case "get_notifications": {
      const { data: notifs } = await admin
        .from("notifications")
        .select("title, body, type, created_at, read_at")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(15);
      if (!notifs?.length) return "No notifications.";
      return notifs.map((n: Record<string, unknown>) => {
        const t = new Date(n.created_at as string).toLocaleString();
        const read = n.read_at ? "(read)" : "(unread)";
        return `- ${n.title}${n.body ? `: ${n.body}` : ""} ${read} [${t}]`;
      }).join("\n");
    }

    case "get_ideas": {
      const { data: ideas } = await admin
        .from("ideas")
        .select("title, category, priority, status, author:profiles!ideas_author_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(15);
      if (!ideas?.length) return "No ideas in the vault yet.";
      return ideas.map((i: Record<string, unknown>) => {
        const a = i.author as { full_name: string | null } | null;
        return `- ${i.title} [${i.status}, ${i.priority ?? "medium"}]${i.category ? ` (${i.category})` : ""} — ${a?.full_name ?? "?"}`;
      }).join("\n");
    }

    case "get_issues": {
      const { data: issues } = await admin
        .from("issues")
        .select("title, priority, status, assignee:profiles!issues_assignee_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(15);
      if (!issues?.length) return "No issues tracked.";
      return issues.map((i: Record<string, unknown>) => {
        const a = i.assignee as { full_name: string | null } | null;
        return `- ${i.title} [${i.status}, ${i.priority ?? "medium"}]${a ? ` → ${a.full_name}` : ""}`;
      }).join("\n");
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ── Main entry point ──────────────────────────────────────────────────────
export async function askAi(question: string): Promise<Answer> {
  const q = (question ?? "").trim();
  if (q.length < 3) return { ok: false, error: "Ask me something…" };    const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  // Fast path: deterministic answers (no API key needed)
  const admin = createAdminClient();
  const today = new Date();

  const [events, approvals, docs, members, recentDms, notifications, ideas, issues] = await Promise.all([
    admin
      .from("calendar_events")
      .select("title, type, start_time, user:profiles!calendar_events_user_id_fkey(full_name)")
      .gte("start_time", today.toISOString())
      .lte("start_time", new Date(today.getTime() + 24 * 3600000).toISOString())
      .order("start_time")
      .limit(15)
      .then((r) => r.data ?? []),
    admin
      .from("approvals")
      .select("id, summary, type, requester:profiles!approvals_requester_id_fkey(full_name)")
      .eq("approver_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(15)
      .then((r) => r.data ?? []),
    admin
      .from("documents")
      .select("title, category, owner:profiles!documents_owner_id_fkey(full_name)")
      .order("uploaded_at", { ascending: false })
      .limit(10)
      .then((r) => r.data ?? []),
    admin
      .from("profiles")
      .select("full_name, role_title, is_founder")
      .order("full_name")
      .limit(30)
      .then((r) => r.data ?? []),
    // Recent DMs involving the current user
    admin
      .from("direct_messages")
      .select("content, created_at, sender:profiles!sender_id(full_name), receiver:profiles!direct_messages_receiver_id_fkey(full_name)")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(10)
      .then((r) => r.data ?? []),
    // Recent notifications
    admin
      .from("notifications")
      .select("title, body, type, read_at")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(10)
      .then((r) => r.data ?? []),
    // Ideas
    admin
      .from("ideas")
      .select("title, category, priority, status")
      .order("created_at", { ascending: false })
      .limit(10)
      .then((r) => r.data ?? []),
    // Issues
    admin
      .from("issues")
      .select("title, priority, status")
      .order("created_at", { ascending: false })
      .limit(10)
      .then((r) => r.data ?? []),
  ]);

  const context = [
    `Today is ${today.toDateString()}.`,
    `Today's calendar:\n${events.map((e: Record<string, unknown>) => {
      const u = e.user as { full_name: string | null } | null;
      return `- ${new Date(e.start_time as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${e.title} (${e.type}, ${u?.full_name ?? "?"})`;
    }).join("\n") || "- nothing scheduled"}`,
    `Pending approvals:\n${approvals.map((a: Record<string, unknown>) => {
      const r = a.requester as { full_name: string | null } | null;
      return `- [${a.id}] ${a.summary} (${r?.full_name ?? "?"})`;
    }).join("\n") || "- none"}`,
    `Recent documents:\n${docs.map((d: Record<string, unknown>) => {
      const o = d.owner as { full_name: string | null } | null;
      return `- ${d.title} (${d.category ?? "General"}, ${o?.full_name ?? "?"})`;
    }).join("\n") || "- none"}`,
    `Team:\n${members.map((m: Record<string, unknown>) => `- ${m.full_name}${m.role_title ? ` (${m.role_title})` : ""}${m.is_founder ? " [founder]" : ""}`).join("\n")}`,
    `Recent direct messages:\n${recentDms.map((m: Record<string, unknown>) => {
      const s = m.sender as { full_name: string | null } | null;
      const r = m.receiver as { full_name: string | null } | null;
      const direction = (m as Record<string, unknown>).sender_id === userId ? `to ${r?.full_name ?? "?"}` : `from ${s?.full_name ?? "?"}`;
      return `- ${direction}: ${(m.content as string)?.slice(0, 120)}`;
    }).join("\n") || "- none"}`,
    `Notifications:\n${notifications.map((n: Record<string, unknown>) => `- ${n.title}${n.body ? `: ${n.body}` : ""}${n.read_at ? " (read)" : " (unread)"}`).join("\n") || "- none"}`,
    `Ideas:\n${ideas.map((i: Record<string, unknown>) => `- ${i.title} [${i.status}, ${i.priority ?? "medium"}]${i.category ? ` (${i.category})` : ""}`).join("\n") || "- none"}`,
    `Issues:\n${issues.map((i: Record<string, unknown>) => `- ${i.title} [${i.status}, ${i.priority ?? "medium"}]`).join("\n") || "- none"}`,
  ].join("\n\n");

  // Load all AI credentials from DB (provider, api_key, model config)
  const { data: creds } = await admin
    .from("ai_credentials")
    .select("id, provider, name, api_key")
    .order("created_at");

  type ProviderConfig = {
    id: string;
    name: string;
    baseUrl: string;
    model: string;
    apiKey: string;
  };

  const providers: ProviderConfig[] = (creds ?? []).map((c: Record<string, unknown>) => {
    const name = (c.name as string) ?? "";
    const key = c.api_key as string;
    if ((c.provider as string) === "groq") {
      return { id: c.id as string, name, baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", apiKey: key };
    }
    // NVIDIA models (stored as 'other')
    if (name.toLowerCase().includes("muse")) {
      return { id: c.id as string, name, baseUrl: "https://integrate.api.nvidia.com/v1", model: "meta/muse-glimmer-30b", apiKey: key };
    }
    if (name.toLowerCase().includes("nemotron")) {
      return { id: c.id as string, name, baseUrl: "https://integrate.api.nvidia.com/v1", model: "nvidia/nemotron-3.5-lightning-30b-a3b", apiKey: key };
    }
    // Fallback: treat as OpenAI-compatible
    return { id: c.id as string, name, baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", apiKey: key };
  });

  // Try each provider in order until one succeeds
  for (const provider of providers) {
    try {
      // First LLM call — decide if tool use is needed
      const firstRes = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.apiKey}` },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            {
              role: "system",
              content: [
                "You are Celeste, the AI assistant for Celeste HQ.",
                "The workspace context below contains ALL data: calendar, approvals, documents, team, chat messages, DMs, notifications, ideas, issues.",
                "YOU ALREADY HAVE ALL THIS DATA. Answer directly from the context. Do NOT say you don't have access.",
                "If the user asks about messages/DMs/chat, the data is in 'Recent direct messages' in the context.",
                "If the user asks about notifications, the data is in 'Notifications' in the context.",
                "If you need MORE data than what's in context, call the tools.",
                "Be concise, direct, and use the user's language. Max 4 sentences.",
                "If the user asks you to do something (create event, invite, approve), call the appropriate tool.",
              ].join(" "),
            },
            { role: "user", content: `Workspace context:\n${context}\n\nUser: ${q}` },
          ],
          tools: TOOLS,
          tool_choice: "auto",
          temperature: 0.3,
          max_tokens: 800,
        }),
        signal: AbortSignal.timeout(20_000),
      });

      if (!firstRes.ok) throw new Error(`${provider.name} ${firstRes.status}`);
      const firstData = (await firstRes.json()) as { choices?: { message?: { content?: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[] };
      const msg = firstData.choices?.[0]?.message;

      // Log to api_metrics for realtime usage tracking (fire-and-forget)
      admin.from("api_metrics").insert({
        provider: provider.baseUrl.includes("groq") ? "groq" : provider.baseUrl.includes("nvidia") ? "nvidia" : "other",
        model: provider.model,
        tokens_used: 0,
        cost: 0,
        latency_ms: 0,
        status: "ok",
        user_id: userId,
      });

      // If no tool calls, return the text answer directly
      if (!(msg?.tool_calls?.length)) {
        const answer = msg?.content?.trim();
        if (answer) return { ok: true, answer: limitAnswer(answer) };
      }

      // Execute tool calls
      const toolResults: { role: "tool"; tool_call_id: string; content: string }[] = [];
      const actions: string[] = [];
      const toolCalls = msg?.tool_calls ?? [];

      for (const tc of toolCalls) {
        const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        const result = await executeTool(tc.function.name, args, userId);
        toolResults.push({ role: "tool", tool_call_id: tc.id, content: result });
        actions.push(result);
      }

      // Second LLM call — synthesize the final answer (same provider)
      const secondRes = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.apiKey}` },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            {
              role: "system",
              content: "You are Celeste. Summarize the tool results for the user concisely. Use their language. Max 4 sentences.",
            },
            { role: "user", content: `User asked: ${q}\n\nTool results:\n${toolResults.map((t) => t.content).join("\n\n")}` },
          ],
          temperature: 0.3,
          max_tokens: 300,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (secondRes.ok) {
        const secondData = (await secondRes.json()) as { choices?: { message?: { content?: string } }[] };
        const answer = secondData.choices?.[0]?.message?.content?.trim();
        if (answer) return { ok: true, answer: limitAnswer(answer), actions };
      }

      // Fallback: return raw tool results
      return { ok: true, answer: limitAnswer(actions.join("\n")), actions };
    } catch (err) {
      // Provider failed (rate limit, auth, etc.) — try next one
      console.warn(`AI provider ${provider.name} failed:`, err instanceof Error ? err.message : err);
      continue;
    }
  }

  // All providers failed — deterministic fallback
  // Deterministic fallback (no API key)
  return { ok: true, answer: limitAnswer(deterministicAnswer(q, context)) };
}

function limitAnswer(answer: string): string {
  return answer.trim();
}

function deterministicAnswer(q: string, context: string): string {
  const t = q.toLowerCase();

  const calendar = context.split("Today's calendar:\n")[1]?.split("\n\nPending")[0] ?? "";
  const approvals = context.split("Pending approvals:\n")[1]?.split("\n\nRecent")[0] ?? "";
  const documents = context.split("Recent documents:\n")[1]?.split("\n\nTeam")[0] ?? "";
  const team = context.split("Team:\n")[1]?.split("\n\nRecent direct")[0] ?? "";
  const dms = context.split("Recent direct messages:\n")[1]?.split("\n\nNotifications")[0] ?? "";
  const notifications = context.split("Notifications:\n")[1]?.split("\n\nIdeas")[0] ?? "";
  const ideas = context.split("Ideas:\n")[1]?.split("\n\nIssues")[0] ?? "";
  const issues = context.split("Issues:\n")[1] ?? "";

  const lines = (s: string) => s.split("\n").filter((l) => l.trim().startsWith("-")).slice(0, 6);

  if (/(vacation|time ?off|calendar|today|schedule|agenda|event)/.test(t)) {
    const evts = lines(calendar);
    return evts.length ? `Today's schedule:\n${evts.join("\n")}` : "Nothing on the calendar today.";
  }
  if (/(approv|pending|review|inbox)/.test(t)) {
    const appr = lines(approvals);
    return appr.length
      ? `You have ${appr.length} pending approvals:\n${appr.join("\n")}\nGo to /approvals to review.`
      : "No approvals waiting. You're all caught up.";
  }
  if (/(document|file|pdf|upload)/.test(t)) {
    const docs = lines(documents);
    return docs.length ? `Recent documents:\n${docs.join("\n")}` : "No recent documents.";
  }
  if (/(who|team|member|person|people|founder|role)/.test(t)) {
    const teamLines = lines(team);
    return teamLines.length ? `Team (${teamLines.length}+ people):\n${teamLines.join("\n")}` : "Can't read the team right now.";
  }
  if (/(message|chat|dm|direct|last message|said|wrote)/.test(t)) {
    const dmLines = lines(dms);
    if (dmLines.length) return "Recent messages:\n" + dmLines.join("\n");
    return "No recent messages found. Start a conversation in the Chat tab.";
  }
  if (/(notification|alert|unread)/.test(t)) {
    const notifLines = lines(notifications);
    if (notifLines.length) return "Your notifications:\n" + notifLines.join("\n");
    return "No notifications.";
  }
  if (/(idea|suggestion|vault)/.test(t)) {
    const ideaLines = lines(ideas);
    if (ideaLines.length) return "Ideas in the vault:\n" + ideaLines.join("\n");
    return "No ideas yet. Add one via the Ideas tab.";
  }
  if (/(issue|bug|problem|track)/.test(t)) {
    const issueLines = lines(issues);
    if (issueLines.length) return "Open issues:\n" + issueLines.join("\n");
    return "No issues tracked.";
  }
  if (/(create|schedule|add|new).*(event|meeting|calendar)/.test(t)) {
    return "I can create events! Try: \"Create a meeting tomorrow at 10am called Team Sync\"\nI'll process natural language commands using Groq AI.";
  }
  if (/(invite|send).*(invite|link)/.test(t)) {
    return "I can send invites! Try: \"Invite john@example.com as Head of Marketing\"\nI'll process natural language commands using Groq AI.";
  }
  if (/(submit|add|new).*(idea|suggestion)/.test(t)) {
    return "I can submit ideas! Try: \"Add an idea: Improve onboarding docs, high priority\"\nI'll process natural language commands using Groq AI.";
  }
  if (/(approve|reject)/.test(t)) {
    return "I can approve requests! Try: \"Approve the vacation request from Mattia\"\nI'll process natural language commands using Groq AI.";
  }

  return [
    "I can help with the workspace in real time. Try asking:",
    '• "Who\'s on vacation today?"',
    '• "What do I need to approve?"',
    '• "Create a meeting tomorrow at 2pm"',
    '• "Invite alice@company.com as Designer"',
    '• "Add an idea: improve the docs"',
    '• "Approve the vacation request"',
    "",
    "I can answer questions AND execute actions for you.",
  ].join("\n");
}
