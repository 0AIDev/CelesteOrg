"use server";

import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getCurrentUserId } from "./document-actions";

type ActionResult = { ok: true; key?: string; prefix?: string } | { ok: false; error: string };

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

const createSchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.array(z.enum(["read", "write", "admin"])).default(["read"]),
});

/** Mint a new API key. The raw key is returned exactly once — we only persist its SHA-256 hash. */
export async function createApiKey(input: Record<string, unknown>): Promise<ActionResult> {
  try {
    const parsed = createSchema.parse(input);
    const supabase = userClient();
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: "Not authenticated" };

    const raw = `cel_${randomBytes(24).toString("base64url")}`;
    const keyHash = createHash("sha256").update(raw).digest("hex");
    const prefix = raw.slice(0, 12) + "…";

    const { error } = await supabase.from("api_keys").insert({
      user_id: userId,
      name: parsed.name,
      key_hash: keyHash,
      prefix,
      scopes: parsed.scopes,
    });

    if (error) return { ok: false, error: error.message };
    revalidatePath("/developers");
    return { ok: true, key: raw, prefix };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create API key";
    return { ok: false, error: msg };
  }
}

export async function revokeApiKey(keyId: string): Promise<ActionResult> {
  try {
    const supabase = userClient();
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", keyId)
      .eq("user_id", userId);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/developers");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not revoke API key";
    return { ok: false, error: msg };
  }
}
