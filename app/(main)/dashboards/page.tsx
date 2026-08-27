import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getUser } from "@/lib/auth";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import Link from "next/link";

export const metadata = { title: "CEO Dashboard - Celeste HQ" };

export default async function DashboardsPage() {
  const supabase = createClient();
  const profile = await getProfile().catch(() => null);
  const authUser = await getUser().catch(() => null);

  const isCEO =
    profile?.is_founder === true || authUser?.app_metadata?.role === "admin";

  if (!isCEO) redirect("/dashboard");

  // Fetch all roles with their holders
  const { data: roles } = await supabase
    .from("roles")
    .select(
      `id, title, level,
       department:departments(name),
       profile:profiles!roles_profile_id_fkey(id, full_name, avatar_url)`,
    )
    .order("level")
    .order("title");

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
        CEO Dashboard
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Overview of all role dashboards across the organization.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {(roles ?? []).map((role) => {
          const p = role.profile as unknown as { id: string; full_name: string | null; avatar_url: string | null } | null;
          const dept = role.department as unknown as { name: string } | null;
          return (
            <Link
              key={role.id}
              href={`/dashboards/${role.id}`}
              className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-[rgba(255,255,255,0.08)] dark:hover:border-[rgba(255,255,255,0.15)] dark:hover:bg-[rgba(255,255,255,0.03)]"
            >
              <SquircleAvatar
                name={p?.full_name ?? "?"}
                src={p?.avatar_url}
                size="sm"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {p?.full_name ?? "Unassigned"}
                </p>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">
                  {role.title}
                  {dept?.name ? ` · ${dept.name}` : ""}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {(!roles || roles.length === 0) && (
        <p className="mt-8 text-center text-sm text-gray-400">
          No roles found. Create roles in the Org Chart first.
        </p>
      )}
    </div>
  );
}
