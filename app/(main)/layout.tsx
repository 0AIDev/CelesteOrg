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

  // Resolve the department name for a subtle context tag in the header.
  let departmentName: string | null = null;
  if (profile?.department_id) {
    const supabase = createClient();
    const { data } = await supabase
      .from("departments")
      .select("name")
      .eq("id", profile.department_id)
      .maybeSingle();
    departmentName = data?.name ?? null;
  }

  return (
    <LayoutProvider
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