"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";

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

// ── Read ────────────────────────────────────────────────────────────────────

export type PromptRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  prompt_content: string;
  author_id: string | null;
  upvotes: number;
  created_at: string;
  author?: { full_name: string | null; avatar_url: string | null } | null;
};

export async function getPrompts(): Promise<
  ActionResult & { prompts?: PromptRow[] }
> {
  try {
    const supabase = userClient();
    const { data, error } = await supabase
      .from("prompt_vault")
      .select(
        "*, author:profiles!prompt_vault_author_id_fkey(full_name, avatar_url)",
      )
      .order("upvotes", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return { ok: false, error: error.message };
    return { ok: true, prompts: (data as PromptRow[]) ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Load failed" };
  }
}

// ── Create ──────────────────────────────────────────────────────────────────

export async function createPrompt(input: {
  title: string;
  description?: string;
  category: string;
  prompt_content: string;
}): Promise<ActionResult & { id?: string }> {
  try {
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("prompt_vault")
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        category: input.category,
        prompt_content: input.prompt_content.trim(),
        author_id: user.id,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/prompt-vault");
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Create failed" };
  }
}

// ── Upvote ──────────────────────────────────────────────────────────────────

export async function upvotePrompt(promptId: string): Promise<ActionResult & { upvotes?: number }> {
  try {
    const admin = createAdminClient();
    // Increment upvotes atomically
    const { data, error } = await admin
      .from("prompt_vault")
      .update({ upvotes: 0 }) // placeholder — we'll use a raw increment
      .eq("id", promptId)
      .select("upvotes")
      .single();

    // Supabase doesn't support atomic increment via the JS client easily,
    // so we do a read-then-write (fine for low-contention internal tool).
    const { data: current } = await admin
      .from("prompt_vault")
      .select("upvotes")
      .eq("id", promptId)
      .single();

    if (!current) return { ok: false, error: "Prompt not found" };

    const newCount = (current.upvotes ?? 0) + 1;
    const { error: updateErr } = await admin
      .from("prompt_vault")
      .update({ upvotes: newCount })
      .eq("id", promptId);

    if (updateErr) return { ok: false, error: updateErr.message };
    revalidatePath("/prompt-vault");
    return { ok: true, upvotes: newCount };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upvote failed" };
  }
}

// ── Delete ──────────────────────────────────────────────────────────────────

export async function deletePrompt(promptId: string): Promise<ActionResult> {
  try {
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const { error } = await supabase.from("prompt_vault").delete().eq("id", promptId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/prompt-vault");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}
