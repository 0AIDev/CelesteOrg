import { createClient } from "@/lib/supabase/server";
import { getUser, getProfile } from "@/lib/auth";
import { TeamsClient } from "@/components/teams/TeamsClient";

export const metadata = { title: "Teams" };

export default async function TeamsPage() {
  const supabase = createClient();
  const user = await getUser().catch(() => null);
  const profile = await getProfile().catch(() => null);

  const [{ data: departments }, { data: profiles }, { data: roles }, { data: anyFounder }] =
    await Promise.all([
      supabase.from("departments").select("*"),
      supabase.from("profiles").select("*"),
      supabase.from("roles").select("profile_id, department_id, title, level"),
      supabase.from("profiles").select("id").eq("is_founder", true).limit(1),
    ]);

  const isFounder = profile?.is_founder === true;
  const isAdmin = user?.app_metadata?.role === "admin";
  const anyFounderExists = (anyFounder?.length ?? 0) > 0;

  const roleTitles = new Map<string, string>();
  for (const r of roles ?? []) {
    if (!roleTitles.has(r.profile_id)) {
      roleTitles.set(r.profile_id, r.title);
    }
  }

  const membersByDept = new Map<string, typeof profiles>();
  for (const p of profiles ?? []) {
    if (!p.department_id) continue;
    const arr = membersByDept.get(p.department_id) ?? [];
    arr.push(p);
    membersByDept.set(p.department_id, arr);
  }

  const membersByDeptClean = Object.fromEntries(membersByDept) as unknown as Record<
    string,
    {
      id: string;
      full_name: string;
      avatar_url: string | null;
      role_title: string | null;
      location: string | null;
      email: string;
    }[]
  >;

  return (
    <TeamsClient
      departments={departments ?? []}
      membersByDept={membersByDeptClean}
      roleTitles={Object.fromEntries(roleTitles)}
      manage={{
        canManage: isFounder || isAdmin,
        canBootstrap: isAdmin && !anyFounderExists,
      }}
    />
  );
}