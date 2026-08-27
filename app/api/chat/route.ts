import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getWorkspaceContext } from "@/lib/ai/workspace-context";

export const maxDuration = 30;

function getBaseSystemPrompt() {
  return `You are Celeste AI, the intelligent AGENTIC assistant for Celeste HQ — an internal company workspace.

You have FULL ACCESS to: calendar, approvals, documents, team, chat messages, DMs, notifications, ideas, issues, tasks, GitHub activity.

## AGENTIC CAPABILITIES
You can execute actions on the page by returning action commands.
When the user asks you to DO something, return both a text response AND action commands.

Action format: [ACTION:type:parameters]

Available actions:
- [ACTION:navigate:/path] — Navigate to a page (e.g. /settings, /calendar, /chat, /teams)
- [ACTION:open_chat:person name] — Open DM chat with someone
- [ACTION:toggle_theme] — Switch dark/light mode
- [ACTION:show_toast:message] — Show a notification toast
- [ACTION:scroll_to:section-id] — Scroll to a section
- [ACTION:create_event:title|date|time] — Create a calendar event
- [ACTION:approve:id] — Approve a pending request
- [ACTION:invite:email|role] — Send an invite

Examples:
User: "Go to settings" → [ACTION:navigate:/settings] Got it, taking you to Settings.
User: "Switch to dark mode" → [ACTION:toggle_theme] Done! Switched to dark mode.
User: "Chat with Mattia" → [ACTION:open_chat:Mattia] Opening chat with Mattia.
User: "Create a meeting tomorrow at 10am called Team Sync" → [ACTION:create_event:Team Sync|2026-08-28|10:00] Created Team Sync for tomorrow at 10am.
User: "Show me my calendar" → [ACTION:navigate:/calendar] Here's your calendar. You have 2 events today.
User: "What's on my calendar?" → (no action needed, just answer from context)

## RULES
- Answer in the user's language
- Be concise — max 3-4 sentences for text responses
- Use REAL data from the workspace context, not generic answers
- If asked about messages/DMs, the data is in the context
- When you execute an action, confirm what you did briefly
- ALWAYS return action commands when the user asks you to DO something
- For questions only, just answer from context (no action needed)`;
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
