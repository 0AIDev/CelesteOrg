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

export async function currentUserId(): Promise<string | null> {
  const supabase = userClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const morningSchema = z.object({
  plan: z.string().min(5, "A short plan helps the team").max(5000),
});

// "Start Morning Standup" — blocks until submitted on first login of the day.
export async function submitMorningReport(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = morningSchema.parse(input);
    const userId = await currentUserId();
    if (!userId) return { ok: false, error: "Not authenticated" };

    const supabase = userClient();
    const date = todayISO();

    const { data: existing } = await supabase
      .from("daily_reports")
      .select("id, morning_plan, status")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    if (existing?.morning_plan) {
      return { ok: false, error: "Morning plan already submitted today." };
    }

    // Upsert: set the morning plan; advance status only if not already submitted.
    const { error } = await supabase.from("daily_reports").upsert(
      {
        user_id: userId,
        date,
        morning_plan: parsed.plan,
        status: existing?.status === "submitted" ? "submitted" : "eod_pending",
      },
      { onConflict: "user_id,date" },
    );

    if (error) return { ok: false, error: error.message };
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not submit standup";
    return { ok: false, error: msg };
  }
}

const eodSchema = z.object({
  summary: z.string().min(5, "Tell the team what you accomplished").max(5000),
  blockers: z.string().max(2000).optional(),
});

// "Submit EOD" — persistent reminder before end of day.
export async function submitEodReport(
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const parsed = eodSchema.parse(input);
    const userId = await currentUserId();
    if (!userId) return { ok: false, error: "Not authenticated" };

    const supabase = userClient();
    const date = todayISO();

    const { data: existing } = await supabase
      .from("daily_reports")
      .select("id, morning_plan")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    if (existing?.morning_plan && parsed.summary) {
      const { error } = await supabase
        .from("daily_reports")
        .update({
          eod_summary: parsed.summary,
          blockers: parsed.blockers,
          status: "submitted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) return { ok: false, error: error.message };
    } else {
      // Submitted EOD without a morning plan (edge case): create a full row.
      const { error } = await supabase.from("daily_reports").upsert(
        {
          user_id: userId,
          date,
          eod_summary: parsed.summary,
          blockers: parsed.blockers,
          morning_plan: existing?.morning_plan ?? null,
          status: "submitted",
        },
        { onConflict: "user_id,date" },
      );
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/reports");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not submit EOD";
    return { ok: false, error: msg };
  }
}

// Contract used by the client modal layers: true if a morning/EOD report is
// still due for the current user today.
export async function myDayStatus(): Promise<
  { ok: true; date: string; morningDone: boolean; eodDone: boolean; reportId?: string } | { ok: false; error: string }
> {
  try {
    const userId = await currentUserId();
    if (!userId) return { ok: false, error: "Not authenticated" };
    const supabase = userClient();
    const date = todayISO();
    const { data } = await supabase
      .from("daily_reports")
      .select("id, morning_plan, eod_summary, status")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    if (!data) {
      return { ok: true, date, morningDone: false, eodDone: false };
    }
    const morningDone = Boolean(data.morning_plan);
    const eodDone = Boolean(data.eod_summary) || data.status === "submitted";
    return {
      ok: true,
      date,
      morningDone,
      eodDone,
      reportId: data.id ?? undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load status";
    return { ok: false, error: msg };
  }
}