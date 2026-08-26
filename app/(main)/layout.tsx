import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser, getProfile } from "@/lib/auth";
import { LayoutProvider } from "@/components/layout/LayoutProvider";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser().catch(() => null);
  if (!user) redirect("/sign-in");

  const profile = await getProfile().catch(() => null);

  // Only founders and admins may invite teammates — the sidebar invite card
  // and modal must not appear (or silently fail) for everyone else.
  const canManage = profile?.is_founder === true || user.app_metadata?.role === "admin";

  // Onboarding is marked complete in the DB by completeOnboarding().
  const isOnboarded = profile?.onboarding_completed === true;

  // Resolve the department name for a subtle context tag in the header.
  const supabase = createClient();
  let departmentName: string | null = null;
  if (profile?.department_id) {
    const { data } = await supabase
      .from("departments")
      .select("name")
      .eq("id", profile.department_id)
      .maybeSingle();
    departmentName = data?.name ?? null;
  }

  // Hierarchical dashboards: viewer sees their own dashboard + all subordinate roles.
  const { data: allRoles } = await supabase
    .from("roles")
    .select("id, title, level, reports_to, profile_id")
    .order("level", { ascending: true });

  const viewerRoleId = (allRoles ?? []).find((r) => r.profile_id === profile?.id)?.id ?? null;

  // Recursively collect all role IDs that report (directly or indirectly) to the viewer.
  function collectSubordinates(roleId: string | null, roles: { id: string; reports_to: string | null }[]): string[] {
    if (!roleId) return [];
    const children = roles.filter((r) => r.reports_to === roleId).map((r) => r.id);
    return [...children, ...children.flatMap((cid) => collectSubordinates(cid, roles))];
  }

  const visibleRoleIds = viewerRoleId
    ? [viewerRoleId, ...collectSubordinates(viewerRoleId, allRoles ?? [])]
    : []; // no role → see nothing (prevents new users from seeing all dashboards)

  const dashboards = (allRoles ?? [])
    .filter((r) => visibleRoleIds.includes(r.id))
    .map((r) => ({
      slug: r.id,
      title: shortRoleTitle(r.title),
      isOwn: viewerRoleId ? r.id === viewerRoleId : false,
    }));

  // Detect onboarding page from the URL pathname (server-side)
  // The onboarding page should not show sidebar/header.
  const isOnboardingPage = false; // Handled client-side by LayoutProvider

  return (
    <LayoutProvider
      canManage={canManage}
      isOnboarded={isOnboarded}
      dashboards={dashboards}
      user={
        user
          ? {
              id: user.id,
              email: user.email ?? "",
              full_name: profile?.full_name ?? "Teammate",
              avatar_url: profile?.avatar_url ?? null,
              departmentName,
            }
          : null
      }
    >
      {children}
    </LayoutProvider>
  );
}

// Sidebar labels stay short ("CEO Dashboard", "Co-Founder Dashboard", …).
function shortRoleTitle(title: string): string {
  const map: Record<string, string> = {
    "chief executive officer": "CEO",
    "co-founder": "Co-Founder",
    "chief technology officer": "CTO",
    "chief financial officer": "CFO",
    "chief operating officer": "COO",
    "chief marketing officer": "CMO",
    "chief product officer": "CPO",
    "head of design": "Head of Design",
    "head of growth": "Head of Growth",
  };
  return map[title.trim().toLowerCase()] ?? title;
}