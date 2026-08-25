import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser, getProfile } from "@/lib/auth";
import { EquityClient } from "@/components/equity/EquityClient";

export const metadata = { title: "Equity" };

export default async function EquityPage() {
  const supabase = createClient();
  const [user, profile] = await Promise.all([getUser().catch(() => null), getProfile().catch(() => null)]);

  // RLS on equity_grants: everyone sees their own row; admins/founders see all.
  const { data: grants } = await supabase
    .from("equity_grants")
    .select(`id, user_id, total_shares, vested_shares, unvested_shares, vesting_start, cliff_months, schedule_type,
             user:profiles!equity_grants_user_id_fkey(id, full_name, avatar_url)`)
    .order("user_id");

  const isAdminOrFounder = !!profile?.is_founder || user?.app_metadata?.role === "admin";

  const mapGrant = (g: Record<string, unknown>) => ({
    id: g.id as string,
    user_id: g.user_id as string,
    total_shares: Number(g.total_shares ?? 0),
    vested_shares: Number(g.vested_shares ?? 0),
    unvested_shares: Number(g.unvested_shares ?? 0),
    vesting_start: g.vesting_start as string,
    cliff_months: Number(g.cliff_months ?? 12),
    schedule_type: (g.schedule_type as string) ?? "monthly",
    user: g.user as unknown as { id: string; full_name: string | null; avatar_url: string | null } | null,
  });

  const all = (grants ?? []).map(mapGrant);

  return (
    <Suspense fallback={null}>
      <EquityClient
        currentUserId={profile?.id ?? null}
        isAdminOrFounder={isAdminOrFounder}
        grants={all}
      />
    </Suspense>
  );
}
