import { redirect } from "next/navigation";
import { getOnboardingData } from "@/app/actions/onboarding-actions";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";

export const metadata = { title: "Onboarding — Celeste HQ" };

export default async function OnboardingPage() {
  const data = await getOnboardingData();
  if (!data) redirect("/sign-in");

  // Already completed? Go to dashboard.
  if (data.profile?.onboarding_completed) redirect("/dashboard");

  return <OnboardingClient data={data} />;
}
