import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Role-specific briefing templates ────────────────────────────────────────
const ROLE_CONTEXT: Record<
  string,
  { focus: string; tone: string; priorities: string[] }
> = {
  ceo: {
    focus: "company health, revenue, team morale, strategic blockers",
    tone: "executive, strategic, decisive",
    priorities: [
      "pending approvals requiring your sign-off",
      "revenue and growth metrics",
      "team capacity and hiring pipeline",
      "strategic blockers escalated to you",
    ],
  },
  "co-founder": {
    focus: "product direction, engineering velocity, founder alignment",
    tone: "collaborative, strategic, hands-on",
    priorities: [
      "product and engineering status",
      "cross-functional blockers",
      "key decisions needed",
      "team sentiment",
    ],
  },
  cto: {
    focus: "engineering velocity, technical debt, infrastructure health, team output",
    tone: "technical, action-oriented, specific",
    priorities: [
      "engineering tasks and sprint progress",
      "technical blockers and incidents",
      "infrastructure and deployment status",
      "team bandwidth and code review backlog",
    ],
  },
  "head of design": {
    focus: "design system health, active design reviews, UX issues",
    tone: "creative, detail-oriented, collaborative",
    priorities: [
      "pending design reviews",
      "active design tasks",
      "UX feedback and issues",
      "design system updates",
    ],
  },
  coo: {
    focus: "operations, processes, compliance, team efficiency",
    tone: "operational, process-driven, efficient",
    priorities: [
      "operational blockers",
      "process improvements needed",
      "compliance and policy status",
      "team resource allocation",
    ],
  },
  "head of growth": {
    focus: "growth metrics, marketing campaigns, pipeline health",
    tone: "data-driven, growth-oriented, fast-paced",
    priorities: [
      "growth metrics and KPIs",
      "active campaigns and their status",
      "pipeline and conversion rates",
      "marketing blockers",
    ],
  },
};

const DEFAULT_ROLE = {
  focus: "team tasks, approvals, and workspace activity",
  tone: "professional, concise, actionable",
  priorities: [
    "pending approvals",
    "recent activity",
    "upcoming deadlines",
    "team updates",
  ],
};

// ── Context gatherer ────────────────────────────────────────────────────────
async function gatherContext(userId: string, roleTitle: string) {
  const admin = createAdminClient();
  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    approvalsRes,
    eventsRes,
    docsRes,
    membersRes,
    githubRes,
    standupsRes,
    equityRes,
  ] = await Promise.all([
    // Pending approvals
    admin
      .from("approvals")
      .select("id, summary, type, requester:profiles!approvals_requester_id_fkey(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),

    // Today's events
    admin
      .from("calendar_events")
      .select("id, title, type, start_time, status, user:profiles!calendar_events_user_id_fkey(full_name)")
      .gte("start_time", todayStart)
      .order("start_time")
      .limit(10),

    // Recent docs (7 days)
    admin
      .from("documents")
      .select("id, title, category, uploaded_at, owner:profiles!documents_owner_id_fkey(full_name)")
      .gte("uploaded_at", weekAgo)
      .order("uploaded_at", { ascending: false })
      .limit(10),

    // Team members
    admin
      .from("profiles")
      .select("id, full_name, role_title")
      .order("full_name")
      .limit(50),

    // GitHub events (24h)
    admin
      .from("github_events")
      .select("id, event_type, title, repository, sender, created_at")
      .gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString())
      .order("created_at", { ascending: false })
      .limit(15),

    // Today's standups
    admin
      .from("daily_reports")
      .select("id, user_id, morning_plan, eod_summary, status, user:profiles!daily_reports_user_id_fkey(full_name)")
      .gte("date", today.toISOString().slice(0, 10))
      .limit(20),

    // Equity summary
    admin
      .from("equity_grants")
      .select("id, total_shares, vested_shares, user:profiles!equity_grants_user_id_fkey(full_name)")
      .limit(10),
  ]);

  const pendingApprovals = approvalsRes.data ?? [];
  const todayEvents = eventsRes.data ?? [];
  const recentDocs = docsRes.data ?? [];
  const team = membersRes.data ?? [];
  const githubEvents = githubRes.data ?? [];
  const standups = standupsRes.data ?? [];
  const equityGrants = equityRes.data ?? [];

  // Build context string
  const sections: string[] = [];

  sections.push(`Team size: ${team.length} members`);

  if (pendingApprovals.length > 0) {
    const items = pendingApprovals
      .map((a: Record<string, unknown>) => {
        const req = a.requester as { full_name: string | null } | null;
        return `- ${a.summary} (from ${req?.full_name ?? "?"})`;
      })
      .join("\n");
    sections.push(`\nPending approvals (${pendingApprovals.length}):\n${items}`);
  } else {
    sections.push("\nPending approvals: none — all caught up");
  }

  if (todayEvents.length > 0) {
    const items = todayEvents
      .map((e: Record<string, unknown>) => {
        const u = e.user as { full_name: string | null } | null;
        const t = new Date(e.start_time as string);
        return `- ${t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${e.title} (${e.type}, ${u?.full_name ?? "?"})`;
      })
      .join("\n");
    sections.push(`\nToday's calendar (${todayEvents.length} events):\n${items}`);
  } else {
    sections.push("\nToday's calendar: no events scheduled");
  }

  if (recentDocs.length > 0) {
    const items = recentDocs
      .slice(0, 5)
      .map((d: Record<string, unknown>) => {
        const o = d.owner as { full_name: string | null } | null;
        return `- ${d.title} by ${o?.full_name ?? "?"} (${d.category ?? "General"})`;
      })
      .join("\n");
    sections.push(`\nRecent documents (${recentDocs.length} this week):\n${items}`);
  }

  if (githubEvents.length > 0) {
    const prs = githubEvents.filter((e: Record<string, unknown>) =>
      (e.event_type as string)?.startsWith("pull_request"),
    );
    const pushes = githubEvents.filter((e: Record<string, unknown>) => e.event_type === "push");
    const deploys = githubEvents.filter((e: Record<string, unknown>) =>
      (e.event_type as string)?.includes("deployment"),
    );
    sections.push(
      `\nGitHub activity (24h): ${pushes.length} pushes, ${prs.length} PRs, ${deploys.length} deploys`,
    );
    if (prs.length > 0) {
      const prList = prs
        .slice(0, 5)
        .map((p: Record<string, unknown>) => `- ${p.title} by ${p.sender ?? "?"}`)
        .join("\n");
      sections.push(`Recent PRs:\n${prList}`);
    }
  }

  if (standups.length > 0) {
    const submitted = standups.filter(
      (s: Record<string, unknown>) => s.status === "submitted",
    );
    const pending = standups.length - submitted.length;
    sections.push(
      `\nStandups today: ${submitted.length} submitted, ${pending} still pending`,
    );
  }

  if (equityGrants.length > 0) {
    const totalShares = equityGrants.reduce(
      (s: number, g: Record<string, unknown>) => s + Number(g.total_shares || 0),
      0,
    );
    sections.push(`\nEquity: ${equityGrants.length} grants, ${totalShares.toLocaleString()} total shares`);
  }

  return sections.join("\n");
}

// ── Clean up AI response ───────────────────────────────────────────────────
function cleanBriefing(raw: string): string {
  if (!raw) return "";

  let text = raw;

  // Strip thinking blocks (<think>...</think> or similar)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  text = text.replace(/<thinking[\s\S]*?<\/thinking>/gi, "");

  // Strip lines that look like thinking/analysis
  text = text.replace(/^\s*(?:Here'?s a thinking process|Let me|I need to|First,|Analysis:|Step \d|\d+\.\s*(?:Analyze|Deconstruct|Review|Check)).*$/gim, "");

  // Remove markdown asterisks (but not HTML strong tags)
  text = text.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+?)\*/g, "$1");

  // Remove markdown headers
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Clean up extra whitespace and empty lines
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}

// ── AI briefing generator ───────────────────────────────────────────────────
async function generateBriefing(
  roleTitle: string,
  userName: string,
  context: string,
): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return generateDeterministicBriefing(roleTitle, userName, context);
  }

  const roleConfig = ROLE_CONTEXT[roleTitle.toLowerCase()] ?? DEFAULT_ROLE;

  const systemPrompt = [
    `You are Celeste, the AI assistant for an internal company HQ.`,
    `Generate a ${roleConfig.tone} morning briefing for ${userName} who is ${roleTitle}.`,
    `Focus on: ${roleConfig.focus}.`,
    `The briefing should be 3-5 sentences, professional, and actionable.`,
    `Start with a brief greeting appropriate for the time of day.`,
    `Highlight the most important items requiring attention, organized by priority.`,
    `Use the workspace data provided to give specific, concrete information.`,
    `Do NOT include any thinking, reasoning, or analysis.`,
    `Do NOT use markdown like asterisks, hashes, or code blocks.`,
    `Do NOT use double asterisks for bold. Instead use HTML <strong> tags.`,
    `Output ONLY the final briefing text. No preamble, no thinking.`,
    `Format: plain text with <strong> for bold and <br> for line breaks.`,
    `Be concise — this should be readable in 30 seconds.`,
  ].join(" ");

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "qwen/qwen3.6-27b",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Role: ${roleTitle}\n\nWorkspace data:\n${context}\n\nGenerate a morning briefing.`,
          },
        ],
        temperature: 0.4,
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    return cleanBriefing(raw) || generateDeterministicBriefing(roleTitle, userName, context);
  } catch {
    return generateDeterministicBriefing(roleTitle, userName, context);
  }
}

// ── Deterministic fallback ──────────────────────────────────────────────────
function generateDeterministicBriefing(
  roleTitle: string,
  userName: string,
  context: string,
): string {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const lines: string[] = [`${greeting}, <strong>${userName}</strong>. Here's your <strong>${roleTitle}</strong> briefing.`];

  // Parse approvals
  const approvalMatch = context.match(/Pending approvals \((\d+)\)/);
  if (approvalMatch) {
    const count = parseInt(approvalMatch[1]);
    lines.push(
      count > 0
        ? `You have <strong>${count} approval${count > 1 ? "s" : ""}</strong> waiting for your review.`
        : "No pending approvals — you're all caught up.",
    );
  }

  // Parse events
  const eventMatch = context.match(/Today's calendar \((\d+) events?\)/);
  if (eventMatch) {
    const count = parseInt(eventMatch[1]);
    lines.push(
      count > 0
        ? `<strong>${count} event${count > 1 ? "s" : ""}</strong> on today's calendar.`
        : "No events scheduled for today.",
    );
  }

  // Parse GitHub
  const ghMatch = context.match(
    /GitHub activity \(24h\): (\d+) pushes, (\d+) PRs, (\d+) deploys/,
  );
  if (ghMatch) {
    const [, pushes, prs, deploys] = ghMatch.map(Number);
    const items = [];
    if (pushes > 0) items.push(`<strong>${pushes}</strong> push${pushes > 1 ? "es" : ""}`);
    if (prs > 0) items.push(`<strong>${prs}</strong> PR${prs > 1 ? "s" : ""}`);
    if (deploys > 0) items.push(`<strong>${deploys}</strong> deploy${deploys > 1 ? "s" : ""}`);
    if (items.length > 0) {
      lines.push(`GitHub activity in the last 24h: ${items.join(", ")}.`);
    }
  }

  // Parse standups
  const standupMatch = context.match(/Standups today: (\d+) submitted, (\d+) still pending/);
  if (standupMatch) {
    const [, submitted, pending] = standupMatch.map(Number);
    if (pending > 0) {
      lines.push(`<strong>${pending}</strong> teammate${pending > 1 ? "s" : ""} haven't submitted their standup yet.`);
    }
  }

  lines.push("\nHave a productive day.");
  return lines.join("<br>");
}

// ── Route handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId as string | undefined;
    const roleTitle = (body.roleTitle as string) || "Team Member";
    const userName = (body.userName as string) || "there";

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const context = await gatherContext(userId, roleTitle);
    const briefing = await generateBriefing(roleTitle, userName ?? "there", context);

    return NextResponse.json({ ok: true, briefing });
  } catch (e) {
    console.error("Briefing error:", e);
    return NextResponse.json(
      { error: "Failed to generate briefing" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
