import { getProfile } from "@/lib/auth";
import { SocialPlanner } from "@/components/social/SocialPlanner";

export const metadata = { title: "Social Planner - Celeste HQ" };
export const dynamic = "force-dynamic";

export default async function SocialPlannerPage() {
  const profile = await getProfile().catch(() => null);
  if (!profile) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-sm text-gray-400">Sign in to access social planner.</p>
      </div>
    );
  }
  return <SocialPlanner />;
}
