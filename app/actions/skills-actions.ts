"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = { ok: true } | { ok: false; error: string };

export type SkillRow = {
  id: string;
  name: string;
  description: string | null;
  trigger_text: string | null;
  implementation: string;
  parameters: { name: string; type: string; required: boolean; description: string }[];
  example_usage: string | null;
  author_id: string | null;
  upvotes: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  author?: { full_name: string | null; avatar_url: string | null } | null;
};

// ── Read ────────────────────────────────────────────────────────────────────

export async function getSkills(): Promise<
  ActionResult & { skills?: SkillRow[] }
> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("skills")
      .select(
        "*, author:profiles!skills_author_id_fkey(full_name, avatar_url)",
      )
      .order("upvotes", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return { ok: false, error: error.message };
    return { ok: true, skills: (data as SkillRow[]) ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Load failed" };
  }
}

// ── Create ──────────────────────────────────────────────────────────────────

export async function createSkill(input: {
  name: string;
  description?: string;
  trigger_text?: string;
  implementation: string;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  example_usage?: string;
  tags?: string[];
}): Promise<ActionResult & { id?: string }> {
  try {
    const admin = createAdminClient();
    // Get user from anon client for author_id
    const { createServerClient } = await import("@supabase/ssr");
    const { cookies } = await import("next/headers");
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
    if (!user) return { ok: false, error: "Not authenticated" };

    const { data, error } = await admin
      .from("skills")
      .insert({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        trigger_text: input.trigger_text?.trim() || null,
        implementation: input.implementation.trim(),
        parameters: input.parameters ?? [],
        example_usage: input.example_usage?.trim() || null,
        author_id: user.id,
        tags: input.tags ?? [],
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/skills-creator");
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Create failed" };
  }
}

// ── Upvote ──────────────────────────────────────────────────────────────────

export async function upvoteSkill(skillId: string): Promise<ActionResult & { upvotes?: number }> {
  try {
    const admin = createAdminClient();
    const { data: current } = await admin
      .from("skills")
      .select("upvotes")
      .eq("id", skillId)
      .single();

    if (!current) return { ok: false, error: "Skill not found" };

    const newCount = (current.upvotes ?? 0) + 1;
    const { error: updateErr } = await admin
      .from("skills")
      .update({ upvotes: newCount, updated_at: new Date().toISOString() })
      .eq("id", skillId);

    if (updateErr) return { ok: false, error: updateErr.message };
    revalidatePath("/skills-creator");
    return { ok: true, upvotes: newCount };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upvote failed" };
  }
}

// ── Delete ──────────────────────────────────────────────────────────────────

export async function deleteSkill(skillId: string): Promise<ActionResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("skills").delete().eq("id", skillId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/skills-creator");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}


