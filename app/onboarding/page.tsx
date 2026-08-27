import { getOnboardingData } from "@/app/actions/onboarding-actions";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";

export const metadata = { title: "Onboarding - Celeste HQ" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { token?: string; welcome?: string };
}) {
  const inviteToken = searchParams?.token ?? null;

  // Fetch data with a timeout — if it fails, render with null so the
  // client shows the account-creation flow instead of a 504.
  let data = null;
  try {
    data = await Promise.race([
      getOnboardingData(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
  } catch {
    // Auth or DB error — show account creation step
  }

  return <OnboardingClient data={data} inviteToken={inviteToken} />;
}
