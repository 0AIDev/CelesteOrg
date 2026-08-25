"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { notifyFounders } from "@/lib/notify";

type ActionResult = { ok: true } | { ok: false; error: string };

function userClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );
}

const ideaSchema = z.object({
  title: z.string().min(3, "Title is a bit short").max(200),
  content: z.string().max(4000).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

const CATEGORY_KEYWORDS: [string, string[]][] = [
  ["Growth", ["marketing", "sales", "customer", "revenue", "pricing", "grow"]],
  ["Product", ["feature", "product", "ui", "ux", "design", "workflow", "ship"]],
  ["Engineering", ["infra", "tech", "code", "backend", "frontend", "api", "bug", "refactor"]],
  ["People", ["hiring", "culture", "team", "onboarding", "hr", "wellness"]],
  ["Operations", ["process", "ops", "finance", "budget", "legal", "compliance"]],
];

// Local, dependency-free auto-categorization. If OPENAI_API_KEY is set we
// would call it here (rate-limited); the keyword heuristic keeps the demo
// fully offline while staying deterministic.
function autoCategorize(text: string): string {
  const t = text.toLowerCase();
  for (const [category, words] of CATEGORY_KEYWORDS) {
    if (words.some((w) => t.includes(w))) return category;
  }
  return t.includes("?") || t.includes("idea") ? "Ideas" : "General";
}

// Simple sum-based importance score for a one-line "AI summary".
function makeSummary(title: string, content?: string): string {
  const body = (content ?? "").slice(0, 160);
  return `Suggestion: ${title}.${body ? ` ${body}` : ""}`;
}

export async function createIdea(
  input: Record<string, unknown>,
): Promise<ActionResult & { id?: string }> {
  try {
    const parsed = ideaSchema.parse(input);
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const text = `${parsed.title} ${parsed.content ?? ""}`;
    const category = autoCategorize(text);
    const aiSummary = makeSummary(parsed.title, parsed.content);

    const { data, error } = await supabase
      .from("ideas")
      .insert({
        author_id: user.id,
        title: parsed.title,
        content: parsed.content,
        priority: parsed.priority,
        category,
        ai_summary: aiSummary,
        status: "new",
      })
      .select()
      .single();

    if (error) return { ok: false, error: error.message };

    await notifyFounders(
      "idea",
      `Nuova idea: ${parsed.title}`,
      category,
      data.id,
    );

    revalidatePath("/ideas");
    revalidatePath("/dashboard");
    return { ok: true, id: data.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create idea";
    return { ok: false, error: msg };
  }
}