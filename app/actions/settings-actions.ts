"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
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

import { createAdminClient } from "@/lib/supabase/admin";

// Server-side avatar upload using admin client (bypasses RLS).
// Accepts a data URL or a public URL; tries storage first, falls back to
// storing the URL directly in the profile.
export async function uploadAvatar(dataUrlOrUrl: string): Promise<ActionResult & { url?: string }> {
  try {
    const supabase = userClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    // If it's already a remote URL (not a data URL), just save it.
    if (dataUrlOrUrl.startsWith("http")) {
      const { error } = await supabase.from("profiles").update({ avatar_url: dataUrlOrUrl }).eq("id", user.id);
      if (error) return { ok: false, error: error.message };
      revalidatePath("/settings");
      revalidatePath("/", "layout");
      return { ok: true, url: dataUrlOrUrl };
    }

    // Data URL → try storage upload first, fall back to storing data URL.
    const admin = createAdminClient();
    const matches = dataUrlOrUrl.match(/^data:image\/([^;]+);base64,(.+)$/);
    if (matches) {
      const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
      const base64 = matches[2];
      const buffer = Buffer.from(base64, "base64");
      const path = `${user.id}/${Date.now()}-avatar.${ext}`;

      // Ensure bucket exists
      await admin.storage.createBucket("avatars", { public: true }).catch(() => {});

      const { error: upErr } = await admin.storage.from("avatars").upload(path, buffer, {
        contentType: `image/${matches[1]}`,
        upsert: true,
      });

      if (!upErr) {
        const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
        const { error } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", user.id);
        if (error) return { ok: false, error: error.message };
        revalidatePath("/settings");
        revalidatePath("/", "layout");
        return { ok: true, url: pub.publicUrl };
      }
    }

    // Fallback: store the data URL directly in the profile (works without storage).
    const { error } = await supabase.from("profiles").update({ avatar_url: dataUrlOrUrl }).eq("id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { ok: true, url: dataUrlOrUrl };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return { ok: false, error: msg };
  }
}

const profileSchema = z.object({
  // Optional: the avatar-upload call only sends { avatar_url }.
  full_name: z.string().min(1).max(200).optional(),
  bio: z.string().max(2000).optional().default(""),
  location: z.string().max(120).optional().default(""),
  previous_companies: z.array(z.string()).optional(),
  avatar_url: z.string().max(5_000_000).optional().nullable(),
});

export async function updateProfile(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = profileSchema.parse(input);
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    // Only touch fields the caller actually sent — so saving the profile
    // form keeps the avatar, and uploading an avatar keeps name/bio/etc.
    const update: Record<string, unknown> = {};
    if (input.full_name !== undefined) update.full_name = parsed.full_name;
    if (input.bio !== undefined) update.bio = parsed.bio || null;
    if (input.location !== undefined) update.location = parsed.location || null;
    if (input.previous_companies !== undefined) {
      update.previous_companies = parsed.previous_companies ?? [];
    }
    if (input.avatar_url !== undefined) update.avatar_url = parsed.avatar_url || null;

    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update profile";
    return { ok: false, error: msg };
  }
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function changePassword(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = passwordSchema.parse(input);
    const supabase = userClient();

    // Verify current password by attempting sign-in (throws if wrong).
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return { ok: false, error: "Not authenticated" };

    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.currentPassword,
    });
    if (verifyErr) return { ok: false, error: "Current password is incorrect." };

    const { error } = await supabase.auth.updateUser({
      password: parsed.newPassword,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not change password";
    return { ok: false, error: msg };
  }
}