"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserId } from "./document-actions";

type Answer = { ok: true; answer: string } | { ok: false; error: string };

/**
 * Ask AI — answers questions about the workspace using live data.
 * - If OPENAI_API_KEY is set, the question is answered by a real model with
 *   the workspace snapshot injected as context.
 * - Otherwise a deterministic keyword router answers from the same snapshot,
 *   so the feature works fully offline.
 */
export async function askAi(question: string): Promise<Answer> {
  const q = (question ?? "").trim();
  if (q.length < 3) return { ok: false, error: "Ask me something…" };

  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const admin = createAdminClient();
  const today = new Date();

  const [events, approvals, docs, members] = await Promise.all([
    admin
      .from("calendar_events")
      .select(`title, type, start_time, user:profiles!calendar_events_user_id_fkey(full_name)`)
      .gte("start_time", today.toISOString())
      .lte("start_time", new Date(today.getTime() + 24 * 3600 * 1000).toISOString())
      .order("start_time")
      .limit(15)
      .then((r) => r.data ?? []),
    admin
      .from("approvals")
      .select(`summary, type, status, requester:profiles!approvals_requester_id_fkey(full_name)`)
      .eq("approver_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(15)
      .then((r) => r.data ?? []),
    admin
      .from("documents")
      .select(`title, category, owner:profiles!documents_owner_id_fkey(full_name)`)
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
    `Today's calendar:\n${(events ?? [])
      .map((e) => `- ${new Date(e.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${e.title} (${e.type}, ${(e.user as unknown as { full_name: string | null } | null)?.full_name ?? "unknown"})`)
      .join("\n") || "- nothing scheduled"}`,
    `Pending approvals for the current user:\n${(approvals ?? [])
      .map((a) => `- ${a.summary} (${a.type}, from ${(a.requester as unknown as { full_name: string | null } | null)?.full_name ?? "unknown"})`)
      .join("\n") || "- none"}`,
    `Recent documents:\n${(docs ?? [])
      .map((d) => `- ${d.title} (${d.category ?? "uncategorized"}, ${(d.owner as unknown as { full_name: string | null } | null)?.full_name ?? "unknown"})`)
      .join("\n") || "- none"}`,
    `Team (${members?.length ?? 0} people):\n${(members ?? [])
      .map((m) => `- ${m.full_name}${m.role_title ? ` (${m.role_title})` : ""}${m.is_founder ? " [founder]" : ""}`)
      .join("\n")}`,
  ].join("\n\n");

  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are Celeste, the internal assistant of a 10-person AI startup. Answer concisely in the user's language, max 4 sentences, using ONLY the workspace context provided. If the answer isn't in the context, say so and suggest the closest page (Dashboard, Calendar, Documents, Ideas, Reports, Approvals).",
            },
            { role: "user", content: `Workspace context:\n${context}\n\nQuestion: ${q}` },
          ],
          temperature: 0.3,
          max_tokens: 300,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const answer = data.choices?.[0]?.message?.content?.trim();
      if (answer) return { ok: true, answer };
    } catch {
      // fall through to the deterministic router so the feature never breaks
    }
  }

  return { ok: true, answer: deterministicAnswer(q, context) };
}

function deterministicAnswer(q: string, context: string): string {
  const t = q.toLowerCase();

  const calendar = context.split("Today's calendar:")[1]?.split("Pending approvals")[0] ?? "";
  const approvals = context.split("Pending approvals for the current user:")[1]?.split("Recent documents:")[0] ?? "";
  const documents = context.split("Recent documents:")[1]?.split("Team (")[0] ?? "";
  const team = context.split("Team (")[1] ?? "";

  const lines = (s: string) => s.split("\n").filter((l) => l.trim().startsWith("-")).slice(0, 6);

  if (/(vacation|ferie|time ?off|assenz|calendar|oggi|today|schedule|agenda|eventi)/.test(t)) {
    const evts = lines(calendar);
    return evts.length
      ? `Ecco il calendario di oggi:\n${evts.join("\n")}`
      : "Nothing on the calendar today — it's all clear.";
  }
  if (/(approv|pending|review|inbox|da approvare)/.test(t)) {
    const appr = lines(approvals);
    return appr.length
      ? `You have ${appr.length} pending approvals:\n${appr.join("\n")}\nFind them in /approvals.`
      : "No approvals waiting. You're all caught up.";
  }
  if (/(document|doc |file|pdf|upload)/.test(t)) {
    const docs = lines(documents);
    return docs.length
      ? `Documenti recenti:\n${docs.join("\n")}`
      : "Non ci sono documenti recenti. Ne carichi uno da /documents?";
  }
  if (/(who|chi|team|member|person|membro|persone|founder|role|ruolo)/.test(t)) {
    const teamLines = lines(team);
    return teamLines.length
      ? `Il team (${teamLines.length}+ persone):\n${teamLines.join("\n")}`
      : "I can't read the org chart right now.";
  }
  if (/(idea|idea vault|suggest|sugger)/.test(t)) {
    return "Hai un'idea? Apri /ideas e aggiungila al vault: la categorizzo e la inoltro ai founder.";
  }
  return [
    "Posso aiutarti con il workspace in tempo reale — prova a chiedermi:",
    "• “Who's on vacation today?”",
    "• “What do I need to approve?”",
    "• “Which documents were uploaded recently?”",
    "• “Chi fa parte del team?”",
    "Per tutto il resto, /ideas raccoglie suggerimenti e /reports il feed quotidiano.",
  ].join("\n");
}
