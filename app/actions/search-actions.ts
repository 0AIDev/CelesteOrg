"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type ActionResult = { ok: true; index: SearchIndex } | { ok: false; error: string };

export type SearchIndex = {
  members: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
    role_title: string | null;
  }[];
  documents: {
    id: string;
    title: string;
    category: string | null;
    owner_name: string | null;
  }[];
  roles: { id: string; title: string; holder: string | null }[];
  ideas: { id: string; title: string }[];
  events: { id: string; title: string; type: string; start_time: string }[];
  approvals: { id: string; summary: string; status: string }[];
};

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

// Everything the ⌘K palette can search. Every query is RLS-scoped to what the
// current user can already see (documents: owner/signer/admin; approvals:
// requester/approver/manager/admin; profiles/roles/ideas/events: org-wide).
export async function getSearchIndex(): Promise<ActionResult> {
  try {
    const supabase = userClient();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, email, role_title")
      .order("full_name", { ascending: true });
    const { data: documents } = await supabase
      .from("documents")
      .select(`id, title, category, owner:profiles!documents_owner_id_fkey(full_name)`)
      .order("uploaded_at", { ascending: false })
      .limit(100);
    const { data: roles } = await supabase
      .from("roles")
      .select(`id, title, profile:profiles!roles_profile_id_fkey(full_name)`);
    const { data: ideas } = await supabase
      .from("ideas")
      .select("id, title")
      .order("created_at", { ascending: false })
      .limit(100);
    const { data: events } = await supabase
      .from("calendar_events")
      .select("id, title, type, start_time")
      .order("start_time", { ascending: false })
      .limit(100);
    const { data: approvals } = await supabase
      .from("approvals")
      .select("id, summary, status")
      .order("created_at", { ascending: false })
      .limit(100);

    return {
      ok: true,
      index: {
        members: (profiles ?? []).map((m) => ({
          id: m.id,
          full_name: m.full_name,
          avatar_url: m.avatar_url,
          email: m.email,
          role_title: m.role_title,
        })),
        documents: (documents ?? []).map((d) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          owner_name:
            (d.owner as unknown as { full_name: string | null } | null)
              ?.full_name ?? null,
        })),
        roles: (roles ?? []).map((r) => ({
          id: r.id,
          title: r.title,
          holder:
            (r.profile as unknown as { full_name: string | null } | null)
              ?.full_name ?? null,
        })),
        ideas: (ideas ?? []).map((i) => ({ id: i.id, title: i.title })),
        events: (events ?? []).map((e) => ({
          id: e.id,
          title: e.title,
          type: e.type,
          start_time: e.start_time,
        })),
        approvals: (approvals ?? []).map((a) => ({
          id: a.id,
          summary: a.summary,
          status: a.status,
        })),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not build search index";
    return { ok: false, error: msg };
  }
}
