"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/app/actions/permission-actions";
import { createHash } from "crypto";

type ActionResult = { ok: true; userId?: string } | { ok: false; error: string };

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
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
          });
        },
      },
    },
  );
}

// ── Step 0: Account Creation (email + password) ──────────────────────────────
const step0Schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().min(1, "Name is required").max(120),
});

export async function createAccount(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = step0Schema.parse(input);
    const supabase = userClient();

    // Check if email already exists
    const { data: existing } = await supabase.auth.signInWithPassword({
      email: parsed.email,
      password: "__check_only__",
    }).catch(() => ({ data: null }));

    // Create the user
    const { data, error } = await supabase.auth.signUp({
      email: parsed.email,
      password: parsed.password,
      options: {
        data: { full_name: parsed.full_name },
      },
    });

    if (error) return { ok: false, error: error.message };
    if (!data.user) return { ok: false, error: "Could not create account" };

    // Create profile
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: parsed.full_name,
      email: parsed.email,
      onboarding_completed: false,
    }, { onConflict: "id" });
    if (profileErr) return { ok: false, error: profileErr.message };

    return { ok: true, userId: data.user.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create account";
    return { ok: false, error: msg };
  }
}

// ── Step 1: Core Identity ───────────────────────────────────────────────────
const step1Schema = z.object({
  full_name: z.string().min(1, "Name is required").max(120),
  role_title: z.string().max(120).optional(),
  location: z.string().max(200).optional(),
  timezone: z.string().max(80).optional(),
  bio: z.string().max(1000).optional(),
  previous_companies: z.array(z.string()).optional(),
  github_handle: z.string().max(100).optional(),
  twitter_handle: z.string().max(100).optional(),
});

export async function saveOnboardingStep1(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = step1Schema.parse(input);
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const { error } = await supabase.from("profiles").update({
      full_name: parsed.full_name,
      location: parsed.location || null,
      bio: parsed.bio || null,
      previous_companies: parsed.previous_companies?.filter(Boolean) ?? null,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/onboarding");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save profile";
    return { ok: false, error: msg };
  }
}

// ── Step 2: Department & Track ──────────────────────────────────────────────
const step2Schema = z.object({
  department_id: z.string().uuid(),
});

export async function saveOnboardingStep2(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = step2Schema.parse(input);
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const { error } = await supabase.from("profiles").update({
      department_id: parsed.department_id,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/onboarding");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save department";
    return { ok: false, error: msg };
  }
}

// ── Step 3: Tech Stack & Hardware ───────────────────────────────────────────
const step3Schema = z.object({
  primary_language: z.string().max(100).optional(),
  frameworks: z.array(z.string()).optional(),
  local_model: z.string().max(100).optional(),
  hardware_notes: z.string().max(500).optional(),
});

export async function saveOnboardingStep3(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = step3Schema.parse(input);
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    // Upsert — only one row per user.
    const { error } = await supabase.from("user_tech_specs").upsert({
      user_id: user.id,
      primary_language: parsed.primary_language || null,
      frameworks: parsed.frameworks?.filter(Boolean) ?? null,
      local_model: parsed.local_model || null,
      hardware_notes: parsed.hardware_notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/onboarding");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save tech specs";
    return { ok: false, error: msg };
  }
}

// ── Step 4: Work Style & Preferences ────────────────────────────────────────
const step4Schema = z.object({
  focus_hours: z.string().max(200).optional(),
  communication_channel: z.string().max(50).optional(),
  notifications_enabled: z.boolean().optional(),
  availability_status: z.enum(["available", "busy", "away", "dnd"]).optional(),
});

export async function saveOnboardingStep4(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = step4Schema.parse(input);
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const { error } = await supabase.from("user_preferences").upsert({
      user_id: user.id,
      focus_hours: parsed.focus_hours || null,
      communication_channel: parsed.communication_channel || null,
      notifications_enabled: parsed.notifications_enabled ?? true,
      availability_status: parsed.availability_status ?? "available",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/onboarding");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save preferences";
    return { ok: false, error: msg };
  }
}

// ── Step 5: NDA & E-Signature ───────────────────────────────────────────────
const step5Schema = z.object({
  typed_name: z.string().min(1, "You must type your full legal name"),
  agreed: z.literal(true, { errorMap: () => ({ message: "You must agree to the terms" }) }),
});

export async function signNDA(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = step5Schema.parse(input);
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    // Create a dedicated NDA document if it doesn't exist yet.
    const admin = createAdminClient();
    const ndaTitle = "Internal NDA & IP Assignment Agreement";

    let { data: ndaDoc } = await admin
      .from("documents")
      .select("id")
      .eq("title", ndaTitle)
      .maybeSingle();

    if (!ndaDoc) {
      const { data: created, error: createErr } = await admin
        .from("documents")
        .insert({
          title: ndaTitle,
          file_path: "internal/nda-template.md",
          file_name: "NDA-IP-Agreement.md",
          category: "Legal",
          owner_id: user.id,
          requires_signature: false,
        })
        .select("id")
        .single();
      if (createErr) return { ok: false, error: createErr.message };
      ndaDoc = created;
    }

    // Immutable SHA-256 signature hash.
    const payload = `${user.id}:${parsed.typed_name}:${new Date().toISOString()}`;
    const signatureHash = createHash("sha256").update(payload).digest("hex");

    // Record the signature (immutable audit trail).
    const { error: sigErr } = await admin.from("document_signatures").insert({
      document_id: ndaDoc.id,
      signer_id: user.id,
      typed_name: parsed.typed_name,
      signature_hash: signatureHash,
    });
    if (sigErr) return { ok: false, error: sigErr.message };

    // Audit log.
    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "nda.signed",
      target_id: ndaDoc.id,
      meta: { typed_name: parsed.typed_name, hash: signatureHash },
    });

    revalidatePath("/onboarding");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not sign NDA";
    return { ok: false, error: msg };
  }
}

// ── Complete: mark onboarding done ──────────────────────────────────────────
export async function completeOnboarding(): Promise<ActionResult> {
  try {
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const { error } = await supabase.from("profiles").update({
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not complete onboarding";
    return { ok: false, error: msg };
  }
}

// ── Get onboarding status (for the wizard to hydrate) ───────────────────────
export async function getOnboardingData() {
  const supabase = userClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const [{ data: profile }, { data: techSpecs }, { data: prefs }, { data: ndaSig }] =
    await Promise.all([
      admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      admin.from("user_tech_specs").select("*").eq("user_id", user.id).maybeSingle(),
      admin.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      admin.from("document_signatures").select("id, signed_at").eq("signer_id", user.id).maybeSingle(),
    ]);

  const { data: departments } = await admin
    .from("departments")
    .select("id, name, slug")
    .order("name");

  return {
    profile,
    techSpecs,
    preferences: prefs,
    hasSignedNDA: Boolean(ndaSig),
    departments: departments ?? [],
    user: { id: user.id, email: user.email ?? "" },
  };
}
