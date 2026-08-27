import { getOnboardingData } from "@/app/actions/onboarding-actions";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";

export const metadata = { title: "Onboarding - Celeste HQ" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { token?: string; welcome?: string };
}) {
  const data = await getOnboardingData();
  const inviteToken = searchParams?.token ?? null;

  return <OnboardingClient data={data} inviteToken={inviteToken} />;
}
