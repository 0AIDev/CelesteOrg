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

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return new Response(JSON.stringify({ error: "Missing GROQ_API_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Use raw fetch for Groq API streaming
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "qwen/qwen3.6-27b",
      messages: [
        { role: "system", content: fullSystem },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Groq API error:", err);
    return new Response(JSON.stringify({ error: "AI service error" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Transform Groq SSE stream to text stream for assistant-ui
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") {
                controller.enqueue(encoder.encode("0:"));
                continue;
              }
              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  // Send as Vercel AI SDK text stream format
                  controller.enqueue(encoder.encode(`3:${JSON.stringify(content)}\n`));
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
    },
  });
}
