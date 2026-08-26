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

    default:
      return `Unknown tool: ${name}`;
  }
}

// ── Main entry point ──────────────────────────────────────────────────────
export async function askAi(question: string): Promise<Answer> {
  const q = (question ?? "").trim();
  if (q.length < 3) return { ok: false, error: "Ask me something…" };

  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  // Fast path: deterministic answers (no API key needed)
  const admin = createAdminClient();
  const today = new Date();

  const [events, approvals, docs, members] = await Promise.all([
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
                "You are Celeste, the AI assistant for an internal company HQ.",
                "You can ANSWER questions about the workspace using the context provided.",
                "You can also EXECUTE actions by calling tools when the user asks you to do something.",
                "Available actions: create calendar events, submit ideas, invite teammates, approve requests.",
                "Always be concise. Use the user's language. Max 4 sentences for answers.",
                "When you execute an action, confirm what you did briefly.",
              ].join(" "),
            },
            { role: "user", content: `Workspace context:\n${context}\n\nUser: ${q}` },
          ],
          tools: TOOLS,
          tool_choice: "auto",
          temperature: 0.3,
          max_tokens: 400,
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
        if (answer) return { ok: true, answer };
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
        if (answer) return { ok: true, answer, actions };
      }

      // Fallback: return raw tool results
      return { ok: true, answer: actions.join("\n"), actions };
    } catch (err) {
      // Provider failed (rate limit, auth, etc.) — try next one
      console.warn(`AI provider ${provider.name} failed:`, err instanceof Error ? err.message : err);
      continue;
    }
  }

  // All providers failed — deterministic fallback
  // Deterministic fallback (no API key)
  return { ok: true, answer: deterministicAnswer(q, context) };
}

function deterministicAnswer(q: string, context: string): string {
  const t = q.toLowerCase();

  const calendar = context.split("Today's calendar:\n")[1]?.split("\n\nPending")[0] ?? "";
  const approvals = context.split("Pending approvals:\n")[1]?.split("\n\nRecent")[0] ?? "";
  const documents = context.split("Recent documents:\n")[1]?.split("\n\nTeam")[0] ?? "";
  const team = context.split("Team:\n")[1] ?? "";

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
