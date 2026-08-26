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

// Only founders and admins may issue or edit equity. The RLS policies on
// equity_grants already enforce this; this check gives a friendly error.
async function requireFounderOrAdmin(): Promise<string> {
  const supabase = userClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_founder")
    .eq("id", user.id)
    .maybeSingle();
  if (!(profile?.is_founder ?? false) && user.app_metadata?.role !== "admin") {
    throw new Error("Only founders and admins can manage equity");
  }
  return user.id;
}

const grantSchema = z.object({
  user_id: z.string().uuid(),
  total_shares: z.number().nonnegative(),
  vested_shares: z.number().nonnegative().optional(),
  vesting_start: z.string().optional(),
  cliff_months: z.number().int().min(0).max(120).optional(),
  schedule_type: z.enum(["monthly", "yearly"]).optional(),
});

export async function createEquityGrant(
  input: Record<string, unknown>,
): Promise<ActionResult & { id?: string }> {
  try {
    const parsed = grantSchema.parse(input);
    await requireFounderOrAdmin();
    const supabase = userClient();

    const { data, error } = await supabase
      .from("equity_grants")
      .insert({
        user_id: parsed.user_id,
        total_shares: parsed.total_shares,
        vested_shares: parsed.vested_shares ?? 0,
        vesting_start: parsed.vesting_start || new Date().toISOString().slice(0, 10),
        cliff_months: parsed.cliff_months ?? 12,
        schedule_type: parsed.schedule_type ?? "monthly",
      })
      .select()
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/equity");
    revalidatePath("/org-chart");
    return { ok: true, id: data.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create grant";
    return { ok: false, error: msg };
  }
}

export async function updateEquityGrant(
  grantId: string,
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = grantSchema.omit({ user_id: true }).parse(input);
    await requireFounderOrAdmin();
    const supabase = userClient();

    const { error } = await supabase
      .from("equity_grants")
      .update({
        total_shares: parsed.total_shares,
        vested_shares: parsed.vested_shares ?? 0,
        vesting_start: parsed.vesting_start,
        cliff_months: parsed.cliff_months ?? 12,
        schedule_type: parsed.schedule_type ?? "monthly",
      })
      .eq("id", grantId);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/equity");
    revalidatePath("/org-chart");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update grant";
    return { ok: false, error: msg };
  }
}

export async function deleteEquityGrant(grantId: string): Promise<ActionResult> {
  try {
    await requireFounderOrAdmin();
    const supabase = userClient();
    const { error } = await supabase.from("equity_grants").delete().eq("id", grantId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/equity");
    revalidatePath("/org-chart");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not delete grant";
    return { ok: false, error: msg };
  }
}
