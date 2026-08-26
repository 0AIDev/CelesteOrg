import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── HMAC verification ───────────────────────────────────────────────────────
function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.warn("WEBHOOK_SECRET not set — skipping signature verification");
    return true; // allow in dev if secret is missing
  }
  const expected = "sha256=" + hmacSha256(secret, body);
  return timingSafeEqual(expected, signature);
}

function hmacSha256(secret: string, message: string): string {
  const { createHmac } = require("crypto") as typeof import("crypto");
  return createHmac("sha256", secret).update(message, "utf8").digest("hex");
}

function timingSafeEqual(a: string, b: string): boolean {
  const { timingSafeEqual: tse } = require("crypto") as typeof import("crypto");
  if (a.length !== b.length) return false;
  return tse(Buffer.from(a), Buffer.from(b));
}

// ── AI summary generation ───────────────────────────────────────────────────
async function generateSummary(
  eventType: string,
  title: string | null,
  body: string | null,
  sender: string,
  repo: string,
): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  const prompt = [
    `You are an engineering summarizer for an internal team.`,
    `Summarize this GitHub ${eventType} event in exactly 2 crisp sentences for the team.`,
    `Repository: ${repo}`,
    sender ? `Author: ${sender}` : "",
    title ? `Title: ${title}` : "",
    body ? `Description:\n${body.slice(0, 1000)}` : "",
    "",
    "Write the summary in plain English. Be specific about what changed and why it matters. Max 2 sentences.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 150,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

// ── Payload normalization ────────────────────────────────────────────────────
type WebhookPayload = Record<string, unknown>;

interface NormalizedEvent {
  event_type: string;
  repository: string;
  sender: string | null;
  sender_avatar: string | null;
  title: string | null;
  body: string | null;
  branch: string | null;
  pr_number: number | null;
  pr_url: string | null;
  payload: WebhookPayload;
}

function normalize(eventType: string, payload: WebhookPayload): NormalizedEvent {
  const repo = (payload.repository as { full_name?: string })?.full_name ?? "unknown/unknown";
  const senderObj = payload.sender as { login?: string; avatar_url?: string } | undefined;
  const sender = senderObj?.login ?? null;
  const avatar = senderObj?.avatar_url ?? null;

  let title: string | null = null;
  let bodyText: string | null = null;
  let branch: string | null = null;
  let prNumber: number | null = null;
  let prUrl: string | null = null;

  switch (eventType) {
    case "push": {
      const ref = (payload.ref as string) ?? "";
      branch = ref.replace("refs/heads/", "");
      const commits = (payload.commits as { message?: string }[]) ?? [];
      title = commits.length === 1 ? (commits[0].message ?? null) : `${commits.length} commits`;
      bodyText = commits.map((c) => c.message).join("\n");
      prUrl = `https://github.com/${repo}/commits/${branch}`;
      break;
    }
    case "pull_request": {
      const pr = payload.pull_request as {
        number?: number;
        title?: string;
        body?: string;
        html_url?: string;
        head?: { ref?: string };
      } | undefined;
      title = pr?.title ?? null;
      bodyText = pr?.body ?? null;
      prNumber = pr?.number ?? null;
      branch = pr?.head?.ref ?? null;
      prUrl = pr?.html_url ?? null;
      // Distinguish opened / closed / merged / synchronized
      const action = (payload.action as string) ?? "";
      if (action) eventType = `pull_request.${action}`;
      break;
    }
    case "pull_request_review": {
      const review = payload.review as { body?: string; html_url?: string } | undefined;
      const pr = payload.pull_request as { number?: number; title?: string } | undefined;
      title = `Review on #${pr?.number ?? "?"}: ${pr?.title ?? ""}`;
      bodyText = review?.body ?? null;
      prNumber = pr?.number ?? null;
      prUrl = review?.html_url ?? null;
      break;
    }
    case "issues": {
      const issue = payload.issue as {
        number?: number;
        title?: string;
        body?: string;
        html_url?: string;
      } | undefined;
      title = `#${issue?.number ?? "?"} ${issue?.title ?? ""}`;
      bodyText = issue?.body ?? null;
      prNumber = issue?.number ?? null;
      prUrl = issue?.html_url ?? null;
      const action = (payload.action as string) ?? "";
      if (action) eventType = `issues.${action}`;
      break;
    }
    case "release": {
      const release = payload.release as { tag_name?: string; name?: string; body?: string; html_url?: string } | undefined;
      title = `Release ${release?.tag_name ?? ""} — ${release?.name ?? ""}`;
      bodyText = release?.body ?? null;
      prUrl = release?.html_url ?? null;
      break;
    }
    case "deployment_status": {
      const ds = payload.deployment_status as { state?: string; description?: string } | undefined;
      const dep = payload.deployment as { ref?: string; environment?: string } | undefined;
      title = `Deploy ${ds?.state ?? "unknown"}: ${dep?.environment ?? ""}`;
      bodyText = ds?.description ?? null;
      branch = dep?.ref ?? null;
      break;
    }
    default:
      title = `${eventType} event`;
  }

  return {
    event_type: eventType,
    repository: repo,
    sender,
    sender_avatar: avatar,
    title,
    body: bodyText,
    branch,
    pr_number: prNumber,
    pr_url: prUrl,
    payload,
  };
}

// ── Route handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // 1. Verify HMAC signature
  const signature = req.headers.get("x-hub-signature-256");
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2. Parse payload
  const eventType = req.headers.get("x-github-event") ?? "unknown";
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 3. Normalize
  const event = normalize(eventType, payload);

  // 4. Generate AI summary (only for meaningful events)
  const summaryWorthy = ["push", "pull_request", "pull_request_review", "issues", "release", "deployment_status"];
  let aiSummary: string | null = null;
  if (summaryWorthy.includes(eventType) || summaryWorthy.some((t) => eventType.startsWith(t))) {
    aiSummary = await generateSummary(
      event.event_type,
      event.title,
      event.body,
      event.sender ?? "unknown",
      event.repository,
    );
  }

  // 5. Insert into Supabase
  const admin = createAdminClient();
  const { error } = await admin.from("github_events").insert({
    event_type: event.event_type,
    repository: event.repository,
    sender: event.sender,
    sender_avatar: event.sender_avatar,
    title: event.title,
    body: event.body?.slice(0, 5000) ?? null, // cap body length
    branch: event.branch,
    pr_number: event.pr_number,
    pr_url: event.pr_url,
    ai_summary: aiSummary,
    payload: event.payload,
  });

  if (error) {
    console.error("GitHub webhook DB error:", error.message);
    return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event_type: event.event_type });
}

// Reject non-POST methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
