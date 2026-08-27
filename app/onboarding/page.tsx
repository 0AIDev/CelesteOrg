import { OnboardingClient } from "@/components/onboarding/OnboardingClient";

export const metadata = { title: "Onboarding - Celeste HQ" };
export const dynamic = "force-dynamic";

// This page performs ZERO server-side data fetching. All Supabase work
// (invite email lookup + profile hydration) happens client-side after
// render, so it can never 504 on a slow cold start.
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { token?: string; welcome?: string };
}) {
  const inviteToken = searchParams?.token ?? null;

  return <OnboardingClient data={null} inviteToken={inviteToken} inviteEmail={null} />;
}
