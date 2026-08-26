import { createClient } from "@/lib/supabase/server";
import { OrgChartLazy } from "@/components/org/OrgChartLazy";
import type { OrgNode } from "@/lib/types";

export const metadata = { title: "Org Chart" };

export default async function OrgChartPage({
  searchParams,
}: {
  searchParams?: { member?: string };
}) {
  const supabase = createClient();

  const [
    { data: roles },
    { data: departments },
    { data: equity },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("roles").select("*"),
    supabase.from("departments").select("*"),
    supabase.from("equity_grants").select("*"),
    supabase.auth.getUser(),
  ]);

  // Fetch profiles who hold roles (for the tree).
  // Filter out null profile_ids — roles without an assigned person are skipped.
  const profileIds = (roles?.map((r) => r.profile_id).filter(Boolean) as string[]) ?? [];
  const { data: profiles } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("*")
        .in("id", profileIds)
    : { data: [] as never[] };

  // Current viewer's private notes (only their own rows are visible via RLS).
  const { data: myNotes } = user
    ? await supabase
        .from("profile_notes")
        .select("subject_id, note")
        .eq("author_id", user.id)
        .then((r) => (r.error ? { data: [] } : r))
    : { data: [] as { subject_id: string; note: string }[] };
  const noteBySubject = new Map(myNotes?.map((n) => [n.subject_id, n.note]) ?? []);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  const deptMap = new Map(departments?.map((d) => [d.id, d]) ?? []);
  const equityByUser = new Map(equity?.map((e) => [e.user_id, e]) ?? []);

  const byRole = new Map<string, OrgNode>();
  for (const r of roles ?? []) {
    const p = profileMap.get(r.profile_id);
    if (!p) continue;
    byRole.set(r.id, {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      bio: p.bio,
      location: p.location,
      previous_companies: p.previous_companies,
      role_title: r.title || p.role_title,
      // The org chart is role-driven: prefer the role's department (which is
      // what the filter tabs count) and fall back to the profile's.
      department_id: r.department_id ?? p.department_id,
      is_founder: p.is_founder,
      onboarding_completed: p.onboarding_completed,
      joined_at: p.joined_at,
      roleId: r.id,
      title: r.title,
      departmentName: p.department_id
        ? deptMap.get(p.department_id)?.name ?? null
        : null,
      reports: [],
    });
  }

  // Wire children.
  for (const r of roles ?? []) {
    if (r.reports_to && byRole.has(r.id) && byRole.has(r.reports_to)) {
      byRole.get(r.reports_to)!.reports.push(byRole.get(r.id)!);
    }
  }

  // Roots = nodes not referenced as a child (i.e. their role id is not in reports_to of anyone at top level).
  const listedAsChild = new Set<string>();
  for (const r of roles ?? []) {
    if (r.reports_to) listedAsChild.add(r.id);
  }
  const roots: OrgNode[] = (roles ?? [])
    .filter((r) => !r.reports_to && byRole.has(r.id))
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
    .map((r) => byRole.get(r.id)!);

  return (
    <OrgChartLazy
      trees={roots}
      departments={
        departments?.map((d) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
          description: d.description,
          color: d.color,
          headcount:
            roles?.filter((r) => r.department_id === d.id).length ?? 0,
        })) ?? []
      }
      equity={{
        byUser: Object.fromEntries(
          Array.from(equityByUser.entries()).map(([k, v]) => [
            k,
            {
              total_shares: Number(v.total_shares),
              vested_shares: Number(v.vested_shares),
              unvested_shares: Number(v.unvested_shares),
              vesting_start: v.vesting_start,
              cliff_months: v.cliff_months,
            },
          ]),
        ),
      }}
      currentUserId={user?.id ?? null}
      myNotes={Object.fromEntries(noteBySubject)}
      initialMemberId={searchParams?.member ?? null}
    />
  );
}