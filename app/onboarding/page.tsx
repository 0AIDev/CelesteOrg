import { getOnboardingData } from "@/app/actions/onboarding-actions";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";

export const metadata = { title: "Onboarding — Celeste HQ" };

export default async function OnboardingPage() {
  // This page works WITHOUT login - shows account creation first
  const data = await getOnboardingData();

  // If user is logged in, pass their data
  // If not logged in, data will be null and client shows step 0 (account creation)
  return <OnboardingClient data={data} />;
}
