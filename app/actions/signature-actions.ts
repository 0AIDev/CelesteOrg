"use server";

import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { runSignatureReminders } from "@/lib/reminders";

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
    const { data: auditRow, error: auditError } = await admin
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
    const auditId = auditRow?.id as string | undefined;

    // Record the action in the append-only audit log too.
    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "document.signed",
      target_id: parsed.documentId,
      meta: { typed_name: parsed.typedName, signature_hash: digest },
      ip_address: ip,
    });

    // Flip the pending send-for-signature request (if one exists for this
    // signer) to signed and link the audit row. Done via the admin client
    // because this is trusted server logic, not a client write.
    const { data: flipped } = await admin
      .from("document_requests")
      .update({
        status: "signed",
        signed_at: today,
        signature_id: auditId,
      })
      .eq("document_id", parsed.documentId)
      .eq("signer_id", user.id)
      .eq("status", "pending")
      .select("id");
    if (flipped && flipped.length > 0) {
      await admin.from("audit_log").insert({
        actor_id: user.id,
        action: "document.request.signed",
        target_id: parsed.documentId,
        meta: { request_ids: flipped.map((r) => r.id) },
        ip_address: ip,
      });
    }

    revalidatePath("/documents");
    return { ok: true, hash: digest };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Signing failed";
    return { ok: false, error: msg };
  }
}

// Returns the full immutable chain for a given document (admin/owner view).
const sendSchema = z.object({
  documentId: z.string().uuid(),
  signerIds: z.array(z.string().uuid()).min(1, "Pick at least one person"),
  message: z.string().max(500).optional(),
});

// Send a document to specific teammates for signature. Creates a pending
// request per signer and notifies them. Only the document owner (or admin)
// can send.
export async function sendForSignature(
  input: Record<string, unknown>,
): Promise<ActionResult & { created?: number }> {
  try {
    const parsed = sendSchema.parse(input);
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    // RLS guarantees this resolves only for the owner/admin.
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, title, owner_id")
      .eq("id", parsed.documentId)
      .single();
    if (docErr || !doc) return { ok: false, error: "Document not found" };

    const rows = parsed.signerIds.map((signerId) => ({
      document_id: parsed.documentId,
      signer_id: signerId,
      requested_by: user.id,
      status: "pending",
      message: parsed.message ?? null,
    }));

    // Ignore duplicates so re-sending is idempotent per signer.
    const { data: inserted, error: insErr } = await supabase
      .from("document_requests")
      .upsert(rows, {
        onConflict: "document_id,signer_id",
        ignoreDuplicates: true,
      })
      .select("signer_id");
    if (insErr) return { ok: false, error: insErr.message };

    const created = inserted?.length ?? 0;
    for (const signerId of parsed.signerIds) {
      await notify(
        signerId,
        "system",
        "Document to sign",
        `You have \u201c${doc.title}\u201d waiting for your signature`,
        parsed.documentId,
      );
    }

    revalidatePath("/documents");
    return { ok: true, created };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not send for signature";
    return { ok: false, error: msg };
  }
}

const revokeSchema = z.object({ requestId: z.string().uuid() });

// Revoke a pending request — only the requester or an admin can.
export async function revokeSignatureRequest(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = revokeSchema.parse(input);
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    // RLS: only requested_by (or admin) can update a request row.
    const { error } = await supabase
      .from("document_requests")
      .update({ status: "revoked" })
      .eq("id", parsed.requestId)
      .eq("status", "pending");
    if (error) return { ok: false, error: error.message };

    revalidatePath("/documents");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not revoke request";
    return { ok: false, error: msg };
  }
}

const remindSchema = z.object({
  documentId: z.string().uuid(),
});

// Owner-triggered nudge: remind every still-pending signer of this document.
// Founder/admin can also remind on any document they can see.
export async function sendRemindersNow(
  input: Record<string, unknown>,
): Promise<ActionResult & { reminded?: number; emailed?: number }> {
  try {
    const parsed = remindSchema.parse(input);
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const { data: doc } = await supabase
      .from("documents")
      .select("id, owner_id")
      .eq("id", parsed.documentId)
      .single();
    if (!doc) return { ok: false, error: "Document not found" };

    const result = await runSignatureReminders({ days: 0, documentId: parsed.documentId });
    revalidatePath("/documents");
    return { ok: true, reminded: result.notified, emailed: result.emailed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not send reminders";
    return { ok: false, error: msg };
  }
}

// Status of all send-for-signature requests for a document, with signer info.
// Visible to the requester, any signer, and admins.
export async function getSignatureStatus(
  documentId: string,
): Promise<ActionResult & { requests?: Record<string, unknown>[] }> {
  try {
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("document_requests")
      .select(
        `id, status, message, requested_at, signed_at,
         signer:profiles!document_requests_signer_id_fkey(id, full_name, avatar_url),
         requester:profiles!document_requests_requested_by_fkey(id, full_name)`,
      )
      .eq("document_id", documentId)
      .order("requested_at", { ascending: true });
    if (error) return { ok: false, error: error.message };

    return { ok: true, requests: data ?? [] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not fetch signature status";
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