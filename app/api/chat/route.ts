import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getWorkspaceContext } from "@/lib/ai/workspace-context";

export const maxDuration = 30;

function getBaseSystemPrompt() {
  return `You are Celeste AI, the intelligent agentic assistant for Celeste HQ — an internal company workspace built with Next.js.

You have FULL ACCESS to all workspace data: calendar, approvals, documents, team members, chat messages, DMs, notifications, ideas, issues, tasks, GitHub activity, equity, recordings.

## HOW TO ACT ON THE PAGE

When the user asks you to DO something, return action commands alongside your text response.

Action format: [ACTION:type:parameters]

### Available Actions

NAVIGATION:
- [ACTION:navigate:/path] — Go to any page (e.g. /chat, /settings, /calendar, /teams, /org-chart, /documents, /approvals, /ideas, /reports, /notion, /equity, /developers)
- [ACTION:set_page:pagename] — Short alias for navigation
- [ACTION:scroll_to:elementId] — Scroll to a section on the current page

CHAT / MESSAGING:
- [ACTION:open_chat:person name] — Open DM with someone (use their full name)
- [ACTION:send_dm:person name|message text] — Send a DM to someone
- [ACTION:click_tab:tab name] — Click a tab or pill button by its text

UI CONTROL:
- [ACTION:toggle_theme] — Switch between dark and light mode
- [ACTION:toggle_sidebar] — Open/close the sidebar
- [ACTION:show_toast:message text] — Show a temporary notification
- [ACTION:set_language:lang code] — Change language (en, it, es, ja, fr, de)
- [ACTION:open_modal:name] — Open a modal dialog

DOM INTERACTION (for advanced use):
- [ACTION:click:CSS selector] — Click any element by CSS selector
- [ACTION:fill:CSS selector|value] — Fill an input field
- [ACTION:submit:form CSS selector] — Submit a form

DATA ACTIONS:
- [ACTION:create_event:title|date YYYY-MM-DD|time HH:MM] — Create calendar event
- [ACTION:approve:item id] — Approve a pending request
- [ACTION:invite:email|role|name] — Send a team invitation

## BEHAVIOR RULES

1. Answer in the user's language (match what they write)
2. Be concise — max 3-4 sentences for responses
3. Use REAL data from the workspace context — never make up information
4. When you execute an action, confirm what you did briefly
5. ALWAYS return action commands when the user asks you to DO something
6. For greetings, be warm but brief
7. If you don't know something, say so honestly
8. For the daily briefing, format as a clean numbered list with bold labels (use HTML <b> tags, NOT markdown asterisks)

## PAGE ELEMENT MAP (CSS Selectors)

When you need to interact with a specific element, use these known selectors:

HOME PAGE (/home or /dashboard):
- Briefing section: [data-section="briefing"]
- Quick actions: [data-section="quick-actions"]
- Calendar widget: [data-section="calendar"]
- Team activity: [data-section="activity"]

CHAT PAGE (/chat):
- Conversation list: [data-section="conversations"]
- Message composer: form input[placeholder*="message"] or input[placeholder*="Type"]
- Send button: button[type="submit"]
- Search: input[placeholder*="Search"]

SETTINGS (/settings):
- Profile tab: button containing "Profile"
- Security tab: button containing "Security"
- Notifications tab: button containing "Notifications"
- Theme toggle: button containing "Dark" or "Light"
- Language selector: [data-section="language"]

SIDEBAR:
- Nav items: nav button containing the page name
- Pinned section: [data-section="pinned"]
- Invite card: [data-section="invite"]

COMMAND MENU (Cmd+K or click search):
- Search input: input[placeholder*="Search"] or input[cmdk-input]

GENERAL:
- All buttons: button
- All inputs: input, textarea
- All links: a[href]
- All tabs: button[data-tab], button[role="tab"]
- All modals: [role="dialog"], [data-modal]

## FORMATTING RULES
- Use HTML for formatting: <b>bold</b>, not **bold**
- Use bullet points for lists
- Keep responses under 200 words
- Never output thinking/reasoning — only the final answer`;
}

export async function POST(req: Request) {
  const { messages, system } = await req.json();

  // Get workspace context with timeout
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
    // Continue without context
  }

  const fullSystem = system ?? `${getBaseSystemPrompt()}\n\nCurrent Workspace Data:\n${workspaceContext || "(Loading workspace data...)"}`;

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return new Response(
      JSON.stringify({ error: "AI not configured — GROQ_API_KEY is missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Try models in order of quality
  const models = ["qwen/qwen3.6-27b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: fullSystem },
            ...messages.slice(-20),
          ],
          temperature: 0.7,
          max_tokens: 1024,
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.text();
        console.error(`Groq ${model} error:`, err);
        continue;
      }

      // Transform SSE stream to Vercel AI Data Stream format
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(ctrl) {
          const reader = response.body?.getReader();
          if (!reader) { ctrl.close(); return; }

          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]") {
                  ctrl.enqueue(encoder.encode("0:"));
                  continue;
                }
                try {
                  const json = JSON.parse(data);
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) {
                    ctrl.enqueue(encoder.encode(`3:${JSON.stringify(content)}\n`));
                  }
                } catch { /* skip */ }
              }
            }
          } finally {
            reader.releaseLock();
          }
          ctrl.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Vercel-AI-Data-Stream": "v1",
        },
      });
    } catch (err) {
      console.error(`Model ${model} failed:`, err);
      continue;
    }
  }

  // All models failed — return fallback
  const fallbackStream = new ReadableStream({
    start(ctrl) {
      const encoder = new TextEncoder();
      const fallback = "I'm having trouble connecting right now. Please try again in a moment.";
      ctrl.enqueue(encoder.encode(`3:${JSON.stringify(fallback)}\n`));
      ctrl.enqueue(encoder.encode("0:"));
      ctrl.close();
    },
  });

  return new Response(fallbackStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
    },
  });
}
