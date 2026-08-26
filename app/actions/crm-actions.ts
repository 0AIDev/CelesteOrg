"use server";

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
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    },
  );
}

// ── Types ───────────────────────────────────────────────────────────────────
export type ContactRow = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  role: string | null;
  status: string;
  source: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  feedback_count?: number;
  avg_rating?: number | null;
};

export type FeedbackRow = {
  id: string;
  contact_id: string;
  rating: number | null;
  category: string;
  content: string;
  source: string;
  created_by: string | null;
  created_at: string;
  contact?: { name: string; company: string | null } | null;
};

// ── Contacts ────────────────────────────────────────────────────────────────
export async function getContacts(): Promise<ActionResult & { contacts?: ContactRow[] }> {
  try {
    const supabase = userClient();
    const { data, error } = await supabase
      .from("crm_contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return { ok: false, error: error.message };

    // Enrich with feedback counts
    const contacts = (data ?? []) as ContactRow[];
    for (const c of contacts) {
      const { count } = await supabase
        .from("customer_feedback")
        .select("id", { count: "exact", head: true })
        .eq("contact_id", c.id);
      c.feedback_count = count ?? 0;

      const { data: ratings } = await supabase
        .from("customer_feedback")
        .select("rating")
        .eq("contact_id", c.id)
        .not("rating", "is", null);
      if (ratings && ratings.length > 0) {
        c.avg_rating = ratings.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / ratings.length;
      }
    }

    return { ok: true, contacts };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Load failed" };
  }
}

export async function createContact(input: {
  name: string;
  email?: string;
  company?: string;
  role?: string;
  status?: string;
  source?: string;
  notes?: string;
}): Promise<ActionResult & { id?: string }> {
  try {
    const supabase = userClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("crm_contacts")
      .insert({
        name: input.name.trim(),
        email: input.email?.trim() || null,
        company: input.company?.trim() || null,
        role: input.role?.trim() || null,
        status: input.status ?? "lead",
        source: input.source ?? "manual",
        notes: input.notes?.trim() || null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/crm");
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Create failed" };
  }
}

export async function updateContact(
  contactId: string,
  fields: { status?: string; notes?: string | null },
): Promise<ActionResult> {
  try {
    const supabase = userClient();
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) cleaned[k] = typeof v === "string" ? v.trim() || null : v;
    }
    cleaned.updated_at = new Date().toISOString();

    const { error } = await supabase.from("crm_contacts").update(cleaned).eq("id", contactId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/crm");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}

export async function deleteContact(contactId: string): Promise<ActionResult> {
  try {
    const supabase = userClient();
    const { error } = await supabase.from("crm_contacts").delete().eq("id", contactId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/crm");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}

// ── Feedback ────────────────────────────────────────────────────────────────
export async function getFeedback(contactId?: string): Promise<ActionResult & { feedback?: FeedbackRow[] }> {
  try {
    const supabase = userClient();
    let query = supabase
      .from("customer_feedback")
      .select("*, contact:crm_contacts(name, company)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (contactId) query = query.eq("contact_id", contactId);

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true, feedback: (data as FeedbackRow[]) ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Load failed" };
  }
}

export async function addFeedback(input: {
  contact_id: string;
  rating?: number;
  category?: string;
  content: string;
  source?: string;
}): Promise<ActionResult & { id?: string }> {
  try {
    const supabase = userClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("customer_feedback")
      .insert({
        contact_id: input.contact_id,
        rating: input.rating ?? null,
        category: input.category ?? "general",
        content: input.content.trim(),
        source: input.source ?? "manual",
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/crm");
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Feedback failed" };
  }
}

export async function deleteFeedback(feedbackId: string): Promise<ActionResult> {
  try {
    const supabase = userClient();
    const { error } = await supabase.from("customer_feedback").delete().eq("id", feedbackId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/crm");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}
