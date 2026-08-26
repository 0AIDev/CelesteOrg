import { getProfile } from "@/lib/auth";
import { IssueTracker } from "@/components/issues/IssueTracker";

export const metadata = { title: "Issues — Celeste HQ" };
export const dynamic = "force-dynamic";

export default async function IssuesPage() {
  const profile = await getProfile().catch(() => null);
  if (!profile) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-sm text-gray-400">Sign in to access issues.</p>
      </div>
    );
  }
  return <IssueTracker />;
}
