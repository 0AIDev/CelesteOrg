import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getUser } from "@/lib/auth";
import {
  RoleDashboardClient,
  type DashboardData,
} from "@/components/dashboards/RoleDashboardClient";
import { PermissionsManager } from "@/components/dashboards/PermissionsManager";
import { getTeamPermissions } from "@/app/actions/permission-actions";

export const metadata = { title: "Role Dashboard" };

export default async function RoleDashboardPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();
  const viewer = await getProfile().catch(() => null);
  const authUser = await getUser().catch(() => null);
  const viewerCanManage = viewer?.is_founder === true || authUser?.app_metadata?.role === "admin";

  const { data: role } = await supabase
    .from("roles")
    .select(
      `id, title, level, reports_to,
       department:departments(name),
       profile:profiles!roles_profile_id_fkey(id, full_name, avatar_url)`,
    )
    .eq("id", params.slug)
    .maybeSingle();

  if (!role) notFound();

  const rawRole = role as unknown as DashboardData["role"] & { reports_to: string | null };
  // Self-referencing embeds are not resolved by PostgREST — fetch the manager
  // title separately.
  let managerTitle: string | null = null;
  if (rawRole.reports_to) {
    const { data: mgr } = await supabase
      .from("roles")
      .select("title")
      .eq("id", rawRole.reports_to)
      .maybeSingle();
    managerTitle = (mgr as { title: string } | null)?.title ?? null;
  }
  const r: DashboardData["role"] = {
    id: rawRole.id,
    title: rawRole.title,
    level: rawRole.level,
    department: rawRole.department,
    profile: rawRole.profile,
    manager: managerTitle ? { title: managerTitle } : null,
  };
  const holderId = r.profile?.id ?? "";

  const [{ data: reports }, { data: approvals }, { data: events }, { data: docs }] =
    await Promise.all([
      supabase
        .from("roles")
        .select(`id, title, profile:profiles!roles_profile_id_fkey(id, full_name, avatar_url)`)
        .eq("reports_to", r.id)
        .order("title"),
      supabase
        .from("approvals")
        .select("id, summary, status, created_at, requester:profiles!approvals_requester_id_fkey(full_name)")
        .eq("approver_id", holderId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("calendar_events")
        .select(
          `id, title, type, start_time, end_time, status,
           user:profiles!calendar_events_user_id_fkey(full_name)`,
        )
        .gte("start_time", new Date().toISOString())
        .lte("start_time", new Date(Date.now() + 14 * 86400000).toISOString())
        .order("start_time", { ascending: true })
        .limit(10),
      supabase
        .from("documents")
        .select("id, title, category, uploaded_at, owner:profiles!documents_owner_id_fkey(full_name)")
        .order("uploaded_at", { ascending: false })
        .limit(5),
    ]);

  const data: DashboardData = {
    role: r,
    reports: (reports ?? []) as unknown as DashboardData["reports"],
    approvals: (approvals ?? []) as unknown as DashboardData["approvals"],
    events: (events ?? []) as unknown as DashboardData["events"],
    docs: (docs ?? []) as unknown as DashboardData["docs"],
    viewerName: viewer?.full_name ?? null,
  };

  // The CEO dashboard hosts the realtime Roles & Permissions manager.
  const isCEO =
    /chief executive officer/i.test(r.title) || /^\s*ceo\s*$/i.test(r.title);
  let teamData: Awaited<ReturnType<typeof getTeamPermissions>> | null = null;
  if (isCEO && viewerCanManage) {
    teamData = await getTeamPermissions();
  }

  return (
    <>
      <RoleDashboardClient data={data} />
      {isCEO && viewerCanManage && teamData?.ok && teamData.members && (
        <div className="mx-auto max-w-6xl px-6 pb-10">
          <PermissionsManager
            initial={teamData.members}
            currentUserId={viewer?.id ?? null}
            viewerIsFounder={viewer?.is_founder === true}
          />
        </div>
      )}
    </>
  );
}
