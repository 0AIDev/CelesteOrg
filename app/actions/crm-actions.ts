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
  deal_value?: number | null;
  deal_stage?: string | null;
  deal_close_date?: string | null;
};

export type ActivityRow = {
  id: string;
  contact_id: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  author?: { full_name: string | null; avatar_url: string | null } | null;
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

// ── Contact move (kanban drag) ─────────────────────────────────────────────
export async function moveContact(contactId: string, newStatus: string): Promise<ActionResult> {
  try {
    const supabase = userClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: old } = await supabase.from("crm_contacts").select("status").eq("id", contactId).single();

    const { error } = await supabase
      .from("crm_contacts")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", contactId);
    if (error) return { ok: false, error: error.message };

    // Log activity
    if (old && old.status !== newStatus) {
      const statusLabels: Record<string, string> = { lead: "Lead", beta_tester: "Beta Tester", customer: "Customer", churned: "Churned" };
      await supabase.from("crm_activities").insert({
        contact_id: contactId,
        type: "status_change",
        description: `Status changed from ${statusLabels[old.status] ?? old.status} to ${statusLabels[newStatus] ?? newStatus}`,
        created_by: user?.id ?? null,
      });
    }

    revalidatePath("/crm");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Move failed" };
  }
}

// ── Full contact update (deal tracking) ─────────────────────────────────────
export async function updateContactFull(
  contactId: string,
  fields: {
    status?: string;
    notes?: string | null;
    deal_value?: number | null;
    deal_stage?: string | null;
    deal_close_date?: string | null;
  },
): Promise<ActionResult> {
  try {
    const supabase = userClient();
    const { data: { user } } = await supabase.auth.getUser();
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) cleaned[k] = typeof v === "string" ? v.trim() || null : v;
    }
    cleaned.updated_at = new Date().toISOString();

    const { error } = await supabase.from("crm_contacts").update(cleaned).eq("id", contactId);
    if (error) return { ok: false, error: error.message };

    // Log activity
    if (fields.deal_value !== undefined || fields.deal_stage !== undefined) {
      const parts: string[] = [];
      if (fields.deal_value !== undefined) parts.push(`Deal value set to $${(fields.deal_value ?? 0).toLocaleString()}`);
      if (fields.deal_stage !== undefined) parts.push(`Deal stage → ${fields.deal_stage ?? "None"}`);
      if (fields.deal_close_date !== undefined) parts.push(`Close date → ${fields.deal_close_date ?? "None"}`);
      if (parts.length > 0) {
        await supabase.from("crm_activities").insert({
          contact_id: contactId,
          type: "deal_update",
          description: parts.join(" · "),
          created_by: user?.id ?? null,
        });
      }
    }

    revalidatePath("/crm");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}

// ── Activities ─────────────────────────────────────────────────────────────
export async function getContactActivities(contactId: string): Promise<ActionResult & { activities?: ActivityRow[] }> {
  try {
    const supabase = userClient();
    const { data, error } = await supabase
      .from("crm_activities")
      .select("*, author:profiles(full_name, avatar_url)")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return { ok: false, error: error.message };
    return { ok: true, activities: (data as ActivityRow[]) ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Load failed" };
  }
}

export async function sendContactEmail(
  contactId: string,
  subject: string,
  body: string,
): Promise<ActionResult & { id?: string }> {
  try {
    const supabase = userClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get contact email
    const { data: contact, error: cErr } = await supabase
      .from("crm_contacts")
      .select("email, name")
      .eq("id", contactId)
      .single();

    if (cErr || !contact?.email) return { ok: false, error: "Contact has no email address" };

    // Send via Resend
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !fromEmail) return { ok: false, error: "Email not configured (RESEND_API_KEY missing)" };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: contact.email,
        subject,
        html: body.replace(/\n/g, "<br>"),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Email failed: ${err}` };
    }

    // Log activity
    const { data: inserted, error: aErr } = await supabase
      .from("crm_activities")
      .insert({
        contact_id: contactId,
        type: "email_sent",
        description: `Email sent to ${contact.name}: "${subject}"`,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    revalidatePath("/crm");
    return { ok: true, id: inserted?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Email failed" };
  }
}

export async function addActivity(input: {
  contact_id: string;
  type: string;
  description: string;
}): Promise<ActionResult & { id?: string }> {
  try {
    const supabase = userClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("crm_activities")
      .insert({
        contact_id: input.contact_id,
        type: input.type,
        description: input.description.trim(),
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Activity failed" };
  }
}
