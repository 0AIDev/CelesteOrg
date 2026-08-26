"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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

// ── Types ───────────────────────────────────────────────────────────────────
export type RecordingRow = {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  duration_sec: number;
  transcript: string | null;
  thumbnail_url: string | null;
  author_id: string | null;
  status: string;
  created_at: string;
  author?: { full_name: string | null; avatar_url: string | null } | null;
};

// ── Read ────────────────────────────────────────────────────────────────────
export async function getRecordings(): Promise<ActionResult & { recordings?: RecordingRow[] }> {
  try {
    const supabase = userClient();
    const { data, error } = await supabase
      .from("screen_recordings")
      .select("*, author:profiles!screen_recordings_author_id_fkey(full_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return { ok: false, error: error.message };
    return { ok: true, recordings: (data as RecordingRow[]) ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Load failed" };
  }
}

// ── Get signed URL for playback ─────────────────────────────────────────────
export async function getRecordingUrl(filePath: string): Promise<ActionResult & { url?: string }> {
  try {
    const supabase = userClient();
    const { data, error } = await supabase.storage
      .from("screen-recordings")
      .createSignedUrl(filePath, 3600);

    if (error) return { ok: false, error: error.message };
    return { ok: true, url: data.signedUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "URL failed" };
  }
}

// ── Insert recording metadata (browser uploads blob directly to Supabase Storage) ──
export async function createRecordingMeta(input: {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  title: string;
  description?: string;
  durationSec: number;
}): Promise<ActionResult & { id?: string }> {
  try {
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const { data, error: insertErr } = await supabase
      .from("screen_recordings")
      .insert({
        title: input.title.trim() || "Untitled recording",
        description: input.description?.trim() || null,
        file_path: input.filePath,
        file_name: input.fileName,
        file_size: input.fileSize,
        mime_type: input.mimeType,
        duration_sec: input.durationSec,
        author_id: user.id,
        status: "ready",
      })
      .select("id")
      .single();

    if (insertErr) return { ok: false, error: insertErr.message };

    revalidatePath("/recordings");
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

// ── Delete recording ────────────────────────────────────────────────────────
export async function deleteRecording(recordingId: string): Promise<ActionResult> {
  try {
    const supabase = userClient();

    const { data: recording } = await supabase
      .from("screen_recordings")
      .select("file_path")
      .eq("id", recordingId)
      .single();

    if (recording?.file_path) {
      await supabase.storage.from("screen-recordings").remove([recording.file_path]);
    }

    const { error } = await supabase.from("screen_recordings").delete().eq("id", recordingId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/recordings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}
