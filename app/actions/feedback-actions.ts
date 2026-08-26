"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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

const feedbackSchema = z.object({
  category: z
    .enum(["General", "Tooling", "Process", "Culture", "Workspace", "Other"])
    .default("General"),
  content: z.string().min(3, "Tell us a bit more").max(2000),
});

export type FeedbackCategory = z.infer<typeof feedbackSchema>["category"];

// Submit feedback about anything that helps the team improve.
export async function submitFeedback(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = feedbackSchema.parse(input);
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const { error } = await supabase.from("feedback").insert({
      author_id: user.id,
      category: parsed.category,
      content: parsed.content.trim(),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not submit feedback";
    return { ok: false, error: msg };
  }
}

export type FeedbackRow = {
  id: string;
  category: string;
  content: string;
  created_at: string;
  author: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

// Team-wide feedback list (RLS: everyone can read).
export async function getFeedback(): Promise<
  { ok: true; rows: FeedbackRow[] } | { ok: false; error: string }
> {
  try {
    const supabase = userClient();
    const { data, error } = await supabase
      .from("feedback")
      .select(
        `id, category, content, created_at,
         author:profiles!feedback_author_id_fkey(id, full_name, avatar_url)`,
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      rows: (data ?? []).map((f) => ({
        id: f.id,
        category: f.category,
        content: f.content,
        created_at: f.created_at,
        author: f.author as unknown as FeedbackRow["author"],
      })),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load feedback";
    return { ok: false, error: msg };
  }
}

