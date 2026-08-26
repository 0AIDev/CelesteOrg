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

  // Onboarding counts as "done" once the new member filled in their profile
  // (step 1 of the wizard) — hide the Onboarding entry from the sidebar then.
  const isOnboarded = Boolean(
    profile?.bio?.trim() ||
      profile?.location?.trim() ||
      (profile?.previous_companies && profile.previous_companies.length > 0),
  );

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

  // One dashboard per role in the org chart (everyone sees them all).
  const { data: roleRows } = await supabase
    .from("roles")
    .select("id, title")
    .order("level", { ascending: true });
  const dashboards = (roleRows ?? []).map((r) => ({
    slug: r.id,
    title: shortRoleTitle(r.title),
  }));

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