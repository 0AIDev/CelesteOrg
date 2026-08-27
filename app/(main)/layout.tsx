import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/auth";
import { LayoutProvider } from "@/components/layout/LayoutProvider";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only two queries: auth user + profile. Everything else (roles, department)
  // was fetched but never passed to any child — it was pure waste.
  const user = await getUser().catch(() => null);
  if (!user) redirect("/sign-in");

  const profile = await getProfile().catch(() => null);

  const canManage =
    profile?.is_founder === true || user.app_metadata?.role === "admin";

  const isOnboarded = profile?.onboarding_completed === true;

  return (
    <LayoutProvider
      canManage={canManage}
      isOnboarded={isOnboarded}
      user={
        user
          ? {
              id: user.id,
              email: user.email ?? "",
              full_name: profile?.full_name ?? "Teammate",
              avatar_url: profile?.avatar_url ?? null,
            }
          : null
      }
    >
      {children}
    </LayoutProvider>
  );
}
