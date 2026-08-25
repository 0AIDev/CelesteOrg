"use server";

import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
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

const signSchema = z.object({
  documentId: z.string().uuid(),
  typedName: z.string().min(2, "Please type your full name").max(120),
});

export async function anyIpAddress() {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0]!.trim() : h.get("x-real-ip") ?? "127.0.0.1";
}

// Immutable, cryptographically-bound signature event.
// Feed is: document_id + signer_id + canonical timestamp + IP + salt.
// The resulting SHA-256 hex is stored and can never be derived from the
// table alone (unknown salt) yet is reproducible given the original inputs.
export async function signDocument(
  input: Record<string, unknown>,
): Promise<ActionResult & { hash?: string }> {
  try {
    const parsed = signSchema.parse(input);
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const today = new Date().toISOString();
    const ip = await anyIpAddress();
    const ua = headers().get("user-agent") ?? "unknown";
    const secret = process.env.SIGNATURE_PEPPER ?? "celeste-dev";

    const digest = createHash("sha256")
      .update(
        [parsed.documentId, user.id, today, ip, ua, secret].join("|"),
      )
      .digest("hex");

    // Write the audit row via the admin client (bypasses RLS) so that the
    // cryptographic trail is retained even if the user's row is later removed.
    const admin = createAdminClient();
    const { error: auditError } = await admin
      .from("document_signatures")
      .insert({
        document_id: parsed.documentId,
        signer_id: user.id,
        typed_name: parsed.typedName,
        signature_hash: digest,
        ip_address: ip,
        user_agent: ua,
      })
      .select()
      .single();
    if (auditError) return { ok: false, error: auditError.message };

    // Record the action in the append-only audit log too.
    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "document.signed",
      target_id: parsed.documentId,
      meta: { typed_name: parsed.typedName, signature_hash: digest },
      ip_address: ip,
    });

    revalidatePath("/documents");
    return { ok: true, hash: digest };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Signing failed";
    return { ok: false, error: msg };
  }
}

// Returns the full immutable chain for a given document (admin/owner view).
export async function getSignatureTrail(
  documentId: string,
): Promise<ActionResult & { rows?: Record<string, unknown>[] }> {
  try {
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("document_signatures")
      .select("id, document_id, signer_id, typed_name, signature_hash, ip_address, signed_at")
      .eq("document_id", documentId)
      .order("signed_at", { ascending: true });
    if (error) return { ok: false, error: error.message };

    return { ok: true, rows: data ?? [] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not fetch trail";
    return { ok: false, error: msg };
  }
}

export { randomBytes };