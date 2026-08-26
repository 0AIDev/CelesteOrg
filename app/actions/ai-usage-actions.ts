"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserId } from "./document-actions";
import { requirePermission } from "./permission-actions";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

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

const credentialSchema = z.object({
  provider: z
    .enum(["openai", "anthropic", "google", "groq", "mistral", "together", "perplexity", "other"])
    .default("other"),
  name: z.string().min(1).max(60),
  api_key: z.string().min(8).max(500),
});

/** Store a provider API key. RLS restricts the raw value to the service role. */
export async function saveAiCredential(input: Record<string, unknown>): Promise<ActionResult> {
  try {
    const parsed = credentialSchema.parse(input);
    if (!(await requirePermission("ai_usage.manage"))) {
      return { ok: false, error: "You don't have permission to manage AI provider keys" };
    }
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: "Not authenticated" };

    const supabase = userClient();
    const { error } = await supabase.from("ai_credentials").insert({
      provider: parsed.provider,
      name: parsed.name.trim(),
      api_key: parsed.api_key.trim(),
      created_by: userId,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/ai-usage");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save credential";
    return { ok: false, error: msg };
  }
}

/** Remove a credential (creator or admin only — enforced by RLS too). */
export async function deleteAiCredential(id: string): Promise<ActionResult> {
  try {
    const supabase = userClient();
    const { error } = await supabase.from("ai_credentials").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/ai-usage");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not delete credential";
    return { ok: false, error: msg };
  }
}

const metricSchema = z.object({
  provider: z.string().min(1).max(40),
  model: z.string().max(80).optional(),
  tokens_used: z.number().int().min(0),
  cost: z.number().min(0).optional(),
  latency_ms: z.number().int().min(0).optional(),
  status: z.enum(["ok", "error", "timeout"]).default("ok"),
});

/**
 * Record a metric attributed to the current user. Used by the "Simulate call"
 * button on the AI usage page so the realtime pipeline is testable end-to-end
 * without waiting for a real provider call.
 */
export async function recordAiMetric(input: Record<string, unknown>): Promise<ActionResult> {
  try {
    const parsed = metricSchema.parse(input);
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: "Not authenticated" };

    const admin = createAdminClient();
    const { error } = await admin.from("api_metrics").insert({
      provider: parsed.provider.toLowerCase(),
      model: parsed.model ?? null,
      tokens_used: parsed.tokens_used,
      cost: parsed.cost ?? 0,
      latency_ms: parsed.latency_ms ?? 0,
      status: parsed.status,
      user_id: userId,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not record metric";
    return { ok: false, error: msg };
  }
}
