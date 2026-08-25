"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
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

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = userClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function requireUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) throw new Error("Not authenticated");
  return id;
}

const uploadSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  category: z.string().optional(),
  requiresSignature: z.boolean().optional(),
  fileName: z.string().min(1),
  fileType: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadSchema>;

// Two-step upload:
//  1. Client requests a Signed URL from us.
//  2. Client PUTs the file bytes to that Signed URL.
//  3. Client calls createDocumentRecord to attach metadata.
export async function createUploadUrl(
  input: UploadDocumentInput,
): Promise<ActionResult & { path?: string }> {
  try {
    const parsed = uploadSchema.parse(input);
    const userId = await requireUserId();
    const admin = createAdminClient();

    // Never trust client-supplied paths — build our own.
    const path = `${userId}/${randomUUID()}-${parsed.fileName.replace(/[^\w.\-]/g, "_")}`;

    const { data, error } = await admin.storage
      .from("documents")
      .createSignedUploadUrl(path);

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, path: data.path };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return { ok: false, error: msg };
  }
}

const recordSchema = z.object({
  title: z.string().min(1),
  category: z.string().optional(),
  requires_signature: z.boolean().optional(),
  file_path: z.string().min(1),
  file_name: z.string(),
  file_size: z.number().optional(),
  mime_type: z.string().optional(),
});

// Idempotent record creation after the upload completes.
export async function createDocumentRecord(
  input: Record<string, unknown>,
): Promise<ActionResult & { id?: string }> {
  try {
    const parsed = recordSchema.parse(input);
    const ownerId = await requireUserId();
    const supabase = userClient();

    const { data, error } = await supabase
      .from("documents")
      .insert({
        title: parsed.title,
        category: parsed.category,
        requires_signature: parsed.requires_signature ?? false,
        file_path: parsed.file_path,
        file_name: parsed.file_name,
        file_size: parsed.file_size ?? 0,
        mime_type: parsed.mime_type,
        owner_id: ownerId,
      })
      .select()
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/documents");
    return { ok: true, id: data.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save document";
    return { ok: false, error: msg };
  }
}

// Signed URLs are short-lived (60s) and generated server-side so the
// private bucket key never reaches the client beforehand.
export async function getDocumentSignedUrl(
  documentId: string,
  action: "download" | "view" = "view",
  ttl = 60,
): Promise<ActionResult & { url?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: "Not authenticated" };

    const supabase = userClient();
    // RLS ensures only owner/admin can read; a signed URL must not widen that.
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, owner_id, file_path")
      .eq("id", documentId)
      .single();
    if (docError || !doc) return { ok: false, error: "Document not found" };

    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from("documents")
      .createSignedUrl(doc.file_path, ttl, {
        download: action === "download" ? `${doc.id}.pdf` : undefined,
        transform: {},
      });

    if (error) return { ok: false, error: error.message };
    return { ok: true, url: data.signedUrl };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not generate link";
    return { ok: false, error: msg };
  }
}

export async function deleteDocument(
  documentId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const supabase = userClient();
    const { data: doc, error: findErr } = await supabase
      .from("documents")
      .select("id, file_path")
      .eq("id", documentId)
      .single();
    if (findErr) return { ok: false, error: "Not found" };

    const admin = createAdminClient();
    await admin.storage.from("documents").remove([doc.file_path]);

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("owner_id", userId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/documents");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return { ok: false, error: msg };
  }
}