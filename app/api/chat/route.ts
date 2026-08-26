import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getWorkspaceContext } from "@/lib/ai/workspace-context";

export const maxDuration = 30;

function getBaseSystemPrompt() {
  return `You are Celeste AI, the intelligent assistant for Celeste HQ — an internal company workspace platform.

Your role:
- Help team members with their daily work
- Answer questions about the workspace, team, calendar, approvals, documents
- Provide insights and summaries based on real data
- Be concise, professional, and actionable

Guidelines:
- Always respond in English
- When you have real data, use it to give specific answers (names, dates, statuses)
- When you don't have enough data, say so honestly
- For actions (creating events, approving things), explain what the user needs to do
- Be direct and efficient — no fluff
- If asked about something outside the workspace, answer normally but prioritize workspace questions`;
}

export async function POST(req: Request) {
  const { messages, system } = await req.json();

  // Get the current user to build workspace context
  let workspaceContext = "";
  try {
    const cookieStore = cookies();
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      },
    );

    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      workspaceContext = await getWorkspaceContext(user.id);
    }
  } catch {
    // If we can't get context, continue without it
  }

  // Build the full system prompt with real workspace data
  const fullSystem = system ?? `${getBaseSystemPrompt()}\n\n---\n\n## Current Workspace State\n\nThe following is real-time data from the workspace. Use this to answer questions accurately:\n\n${workspaceContext || "(No workspace data available)"}`;

  const result = streamText({
    model: groq("qwen/qwen3.6-27b"),
    system: fullSystem,
    messages,
  });

  return result.toUIMessageStreamResponse();
}
