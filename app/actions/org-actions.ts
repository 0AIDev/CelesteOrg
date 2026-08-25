"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type NoteResult = { ok: true } | { ok: false; error: string };

/**
 * Save (upsert) a private note about a teammate. Only the author can see or
 * edit their own notes (RLS-enforced in profile_notes).
 */
export async function saveProfileNote(
  subjectId: string,
  note: string,
): Promise<NoteResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("profile_notes")
    .upsert(
      {
        author_id: user.id,
        subject_id: subjectId,
        note: note.slice(0, 5000),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "author_id,subject_id" },
    );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Summarize a teammate's workspace history with AI. Uses OpenAI when
 * OPENAI_API_KEY is set; otherwise builds a deterministic digest from the
 * same data. The result is cached on profiles.summarize_with_ai (anyone in
 * the org can read it).
 */
export async function summarizeProfile(
  subjectId: string,
  subjectName: string,
): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // ── Gather the person's workspace history ────────────────────────────────
  const [profile, reports, events, ideasRes, docsRes, approvals, roles] = await Promise.all([
    admin.from("profiles").select("full_name, bio, location, previous_companies, role_title, joined_at").eq("id", subjectId).maybeSingle(),
    admin
      .from("daily_reports")
      .select("date, morning_plan, eod_summary, blockers")
      .eq("user_id", subjectId)
      .order("date", { ascending: false })
      .limit(30),
    admin
      .from("calendar_events")
      .select("title, type, start_time")
      .eq("user_id", subjectId)
      .order("start_time", { ascending: false })
      .limit(30),
    admin.from("ideas").select("title, status, created_at").eq("author_id", subjectId).order("created_at", { ascending: false }).limit(20),
    admin.from("documents").select("title, category, uploaded_at").eq("owner_id", subjectId).order("uploaded_at", { ascending: false }).limit(20),
    admin.from("approvals").select("summary, status, created_at").eq("requester_id", subjectId).order("created_at", { ascending: false }).limit(20),
    admin
      .from("roles")
      .select("title, level, created_at, department:departments(name)")
      .eq("profile_id", subjectId),
  ]);

  const p = profile.data as {
    full_name?: string | null;
    bio?: string | null;
    location?: string | null;
    previous_companies?: string[] | null;
    role_title?: string | null;
    joined_at?: string | null;
  } | null;

  const history: string[] = [];
  history.push(`Person: ${p?.full_name ?? subjectName}`);
  if (p?.role_title) history.push(`Role: ${p.role_title}`);
  if (p?.location) history.push(`Location: ${p.location}`);
  if (p?.joined_at) history.push(`Joined: ${new Date(p.joined_at).toLocaleDateString()}`);
  if (p?.bio) history.push(`Bio: ${p.bio}`);
  if (p?.previous_companies?.length) history.push(`Previous companies: ${p.previous_companies.join(", ")}`);
  if (roles.data?.length) {
    history.push(
      `Positions: ${(roles.data as unknown as { title: string; department?: { name?: string | null } | { name?: string | null }[] | null }[])
        .map((r) => {
          const dept = Array.isArray(r.department) ? r.department[0] : r.department;
          return `${r.title}${dept?.name ? ` (${dept.name})` : ""}`;
        })
        .join(" → ")}`,
    );
  }
  const rep = (reports.data as { date: string; morning_plan: string | null; eod_summary: string | null; blockers: string | null }[] | null) ?? [];
  if (rep.length) {
    history.push(
      `Recent standups (${rep.length}): ${rep
        .slice(0, 8)
        .map((r) => `${r.date}: ${r.morning_plan ?? ""} ${r.eod_summary ?? ""}${r.blockers ? ` [blocker: ${r.blockers}]` : ""}`)
        .join(" | ")}`,
    );
  }
  const evts = (events.data as { title: string; type: string; start_time: string }[] | null) ?? [];
  if (evts.length) history.push(`Calendar: ${evts.slice(0, 10).map((e) => `${e.title} (${e.type}, ${new Date(e.start_time).toLocaleDateString()})`).join(", ")}`);
  const ideaRows = (ideasRes.data as { title: string; status: string }[] | null) ?? [];
  if (ideaRows.length) history.push(`Ideas submitted: ${ideaRows.slice(0, 8).map((i) => `${i.title} [${i.status}]`).join(", ")}`);
  const docRows = (docsRes.data as { title: string; category: string | null }[] | null) ?? [];
  if (docRows.length) history.push(`Documents: ${docRows.slice(0, 8).map((d) => d.title).join(", ")}`);
  const appr = (approvals.data as { summary: string; status: string }[] | null) ?? [];
  if (appr.length) history.push(`Approvals requested: ${appr.slice(0, 8).map((a) => `${a.summary} [${a.status}]`).join(", ")}`);

  const context = history.join("\n");

  let summary = "";
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You summarize a person's internal workspace activity for their colleagues. Write 3-5 concise sentences in the team's language (Italian if the input is Italian), covering their role, what they've been working on, notable contributions and any blockers. No filler.",
            },
            { role: "user", content: `Workspace history:\n${context}` },
          ],
          temperature: 0.3,
          max_tokens: 400,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) {
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        summary = data.choices?.[0]?.message?.content?.trim() ?? "";
      }
    } catch {
      // fall through to the deterministic digest
    }
  }

  if (!summary) {
    // Deterministic digest — works fully offline.
    const bits: string[] = [];
    if (p?.role_title) bits.push(`${p.role_title} at Celeste`);
    if (rep.length) bits.push(`${rep.length} standup updates`);
    if (ideaRows.length) bits.push(`${ideaRows.length} ideas submitted`);
    if (docRows.length) bits.push(`${docRows.length} documents`);
    if (appr.length) bits.push(`${appr.length} approvals`);
    const blockerCount = rep.filter((r) => r.blockers).length;
    if (blockerCount) bits.push(`${blockerCount} blocker(s) reported`);
    summary =
      bits.length > 0
        ? `${p?.full_name ?? subjectName} is ${bits.join(" · ")}.`
        : `${p?.full_name ?? subjectName} has no workspace activity recorded yet.`;
  }

  // Cache the summary (admins or service role can write the column).
  await admin.from("profiles").update({ summarize_with_ai: summary }).eq("id", subjectId);

  return { ok: true, summary };
}
