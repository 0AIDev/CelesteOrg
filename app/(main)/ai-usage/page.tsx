import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser, getProfile } from "@/lib/auth";
import { AiUsageClient } from "@/components/ai-usage/AiUsageClient";

export const metadata = { title: "Realtime AI Usage" };

export default async function AiUsagePage() {
  const supabase = createClient();
  const [user, profile] = await Promise.all([getUser().catch(() => null), getProfile().catch(() => null)]);

  const [{ data: metrics }, { data: credentials }, { data: members }] = await Promise.all([
    supabase
      .from("api_metrics")
      .select(
        `id, provider, model, tokens_used, cost, latency_ms, status, recorded_at,
         user:profiles!api_metrics_user_id_fkey(id, full_name, avatar_url)`,
      )
      .order("recorded_at", { ascending: false })
      .limit(300),
    supabase.from("ai_credentials").select("id, provider, name, created_by, created_at"),
    supabase.from("profiles").select("id, full_name, avatar_url"),
  ]);

  const isAdminOrFounder = !!profile?.is_founder || user?.app_metadata?.role === "admin";

  return (
    <Suspense fallback={null}>
      <AiUsageClient
        currentUserId={profile?.id ?? null}
        isAdminOrFounder={isAdminOrFounder}
        metrics={
          metrics?.map((m) => ({
            id: m.id,
            provider: m.provider,
            model: m.model,
            tokens: Number(m.tokens_used ?? 0),
            cost: Number(m.cost ?? 0),
            latency: Number(m.latency_ms ?? 0),
            status: m.status,
            recorded_at: m.recorded_at,
            user: m.user as unknown as { id: string; full_name: string | null; avatar_url: string | null } | null,
          })) ?? []
        }
        credentials={
          credentials?.map((c) => ({
            id: c.id,
            provider: c.provider,
            name: c.name,
            created_by: c.created_by,
            created_at: c.created_at,
          })) ?? []
        }
        members={
          members?.map((p) => ({ id: p.id, full_name: p.full_name, avatar_url: p.avatar_url })) ?? []
        }
      />
    </Suspense>
  );
}
