"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SocialPlatform = "twitter" | "linkedin";
export type DraftStatus = "draft" | "scheduled" | "published";

export type SocialDraft = {
  id: string;
  platform: SocialPlatform;
  title: string | null;
  content: string;
  status: DraftStatus;
  scheduled_for: string | null;
  media_urls: string[];
  hashtags: string[] | null;
  author_id: string | null;
  published_at: string | null;
  engagement: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // joined
  author_name?: string;
  author_avatar?: string | null;
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getSocialDrafts(filters?: {
  status?: DraftStatus;
  platform?: SocialPlatform;
}): Promise<SocialDraft[]> {
  const sb = await createClient();
  let query = sb
    .from("social_drafts")
    .select("*, author:profiles!author_id(full_name, avatar_url)")
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.platform) query = query.eq("platform", filters.platform);

  const { data, error } = await query;
  if (error) {
    console.error("[social-drafts] getSocialDrafts:", error.message);
    return [];
  }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as Omit<SocialDraft, "author_name" | "author_avatar">),
    author_name: (r.author as Record<string, unknown>)?.full_name as string ?? "Unknown",
    author_avatar: (r.author as Record<string, unknown>)?.avatar_url as string ?? null,
  })) as SocialDraft[];
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createSocialDraft(input: {
  platform: SocialPlatform;
  title?: string;
  content: string;
  hashtags?: string[];
  scheduled_for?: string;
}): Promise<{ ok: boolean; draft?: SocialDraft; error?: string }> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const status: DraftStatus = input.scheduled_for ? "scheduled" : "draft";

  const { data, error } = await sb
    .from("social_drafts")
    .insert({
      platform: input.platform,
      title: input.title || null,
      content: input.content,
      hashtags: input.hashtags?.length ? input.hashtags : null,
      scheduled_for: input.scheduled_for || null,
      status,
      author_id: user.id,
    })
    .select("*, author:profiles!author_id(full_name, avatar_url)")
    .single();

  if (error) return { ok: false, error: error.message };

  const r = data as Record<string, unknown>;
  revalidatePath("/social-planner");
  return {
    ok: true,
    draft: {
      ...(r as Omit<SocialDraft, "author_name" | "author_avatar">),
      author_name: (r.author as Record<string, unknown>)?.full_name as string ?? "You",
      author_avatar: (r.author as Record<string, unknown>)?.avatar_url as string ?? null,
    } as SocialDraft,
  };
}

export async function updateSocialDraft(
  id: string,
  changes: {
    title?: string;
    content?: string;
    status?: DraftStatus;
    platform?: SocialPlatform;
    hashtags?: string[];
    scheduled_for?: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { error } = await sb.from("social_drafts").update(changes).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/social-planner");
  return { ok: true };
}

export async function deleteSocialDraft(id: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { error } = await sb.from("social_drafts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/social-planner");
  return { ok: true };
}

export async function publishDraft(id: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { error } = await sb
    .from("social_drafts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/social-planner");
  return { ok: true };
}

// ─── AI Refine ───────────────────────────────────────────────────────────────

export async function refineContent(
  content: string,
  platform: SocialPlatform,
  style: "hook" | "professional" | "casual" | "engaging" = "hook",
): Promise<{ ok: boolean; refined?: string; error?: string }> {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return { ok: false, error: "AI not configured (GROQ_API_KEY missing)" };
  }

  const stylePrompts: Record<string, string> = {
    hook: "Rewrite this as a compelling social media post with a strong hook in the first line. Keep it concise and impactful.",
    professional: "Rewrite this in a professional, polished tone suitable for LinkedIn. Maintain key messages.",
    casual: "Rewrite this in a casual, friendly tone. Make it feel authentic and relatable.",
    engaging: "Rewrite this to maximize engagement. Add a question or call-to-action at the end.",
  };

  const platformGuide = platform === "twitter"
    ? "Keep it under 280 characters. Use line breaks for readability. No hashtags needed."
    : "Keep it professional but engaging. 1-3 short paragraphs. Add 3-5 relevant hashtags at the end.";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a social media copywriter for Celeste, an AI-powered company HQ platform. ${platformGuide} ${stylePrompts[style]}`,
          },
          {
            role: "user",
            content: `Refine this ${platform} post:\n\n${content}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      return { ok: false, error: "AI request failed" };
    }

    const json = await res.json();
    const refined = json.choices?.[0]?.message?.content?.trim();
    if (!refined) return { ok: false, error: "Empty AI response" };

    return { ok: true, refined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "AI error" };
  }
}
