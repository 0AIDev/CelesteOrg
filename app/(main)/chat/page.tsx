import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { InternalChatHub } from "@/components/chat/InternalChatHub";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const profile = await getProfile().catch(() => null);

  if (!profile) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-sm text-gray-400">Sign in to access chat.</p>
      </div>
    );
  }

  return <InternalChatHub />;
}
