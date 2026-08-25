import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/app/actions/document-actions";
import { DevelopersClient } from "@/components/developers/DevelopersClient";

export const metadata = { title: "Developers" };

export default async function DevelopersPage() {
  const supabase = createClient();
  const userId = await getCurrentUserId().catch(() => null);

  const [{ data: keys }, { data: metrics }] = await Promise.all([
    userId
      ? supabase
          .from("api_keys")
          .select("id, name, prefix, scopes, last_used_at, revoked_at, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    supabase
      .from("api_metrics")
      .select("provider, tokens_used, cost, latency_ms, status, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(500),
  ]);

  return (
    <Suspense fallback={null}>
      <DevelopersClient
        keys={
          keys?.map((k) => ({
            id: k.id,
            name: k.name,
            prefix: k.prefix,
            scopes: k.scopes ?? ["read"],
            last_used_at: k.last_used_at,
            revoked_at: k.revoked_at,
            created_at: k.created_at,
          })) ?? []
        }
        metrics={
          metrics?.map((m) => ({
            provider: m.provider,
            tokens: Number(m.tokens_used ?? 0),
            cost: Number(m.cost ?? 0),
            latency: Number(m.latency_ms ?? 0),
            status: m.status,
            recorded_at: m.recorded_at,
          })) ?? []
        }
      />
    </Suspense>
  );
}
