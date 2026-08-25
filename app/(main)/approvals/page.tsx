import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { ApprovalsClient } from "@/components/approvals/ApprovalsClient";

export const metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const supabase = createClient();
  const profile = await getProfile().catch(() => null);
  const userId = profile?.id ?? "";

  const [{ data: pending }, { data: history }] = await Promise.all([
    supabase
      .from("approvals")
      .select(
        `id, summary, type, created_at,
         requester:profiles!approvals_requester_id_fkey(id, full_name, avatar_url)`,
      )
      .eq("approver_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("approvals")
      .select(
        `id, summary, type, status, reviewed_at, created_at,
         requester:profiles!approvals_requester_id_fkey(id, full_name, avatar_url)`,
      )
      .eq("approver_id", userId)
      .in("status", ["approved", "rejected"])
      .order("reviewed_at", { ascending: false })
      .limit(40),
  ]);

  return (
    <Suspense fallback={null}>
      <ApprovalsClient
        firstName={profile?.full_name?.split(" ")[0] ?? "there"}
        pending={
          pending?.map((a) => ({
            id: a.id,
            summary: a.summary,
            type: a.type,
            created_at: a.created_at,
            requester: a.requester as unknown as { id: string; full_name: string | null; avatar_url: string | null } | null,
          })) ?? []
        }
        history={
          history?.map((a) => ({
            id: a.id,
            summary: a.summary,
            type: a.type,
            status: a.status,
            reviewed_at: a.reviewed_at,
            created_at: a.created_at,
            requester: a.requester as unknown as { id: string; full_name: string | null; avatar_url: string | null } | null,
          })) ?? []
        }
      />
    </Suspense>
  );
}
