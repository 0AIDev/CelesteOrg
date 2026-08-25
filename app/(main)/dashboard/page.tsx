import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { myDayStatus } from "@/app/actions/report-actions";

export const metadata = { title: "Home" };

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  const supabase = createClient();
  const profile = await getProfile().catch(() => null);

  // Global date-range filter (?from=YYYY-MM-DD&to=YYYY-MM-DD). Null = no filter.
  const from = searchParams?.from ? `${searchParams.from}T00:00:00` : null;
  const to = searchParams?.to ? `${searchParams.to}T23:59:59` : null;
  const range = {
    start: searchParams?.from ?? null,
    end: searchParams?.to ?? null,
  };



  const [{ data: pendingApprovals }, { data: todayEvents }, { data: recentDocs }, { data: docRequests }, { data: openIdeas }, { data: activity }, day] =
    await Promise.all([
      supabase
        .from("approvals")
        .select(
          `id, summary, type, created_at,
           requester:profiles!approvals_requester_id_fkey(id, full_name, avatar_url)`,
        )
        .eq("approver_id", profile?.id ?? "")
        .eq("status", "pending")
        .gte("created_at", from ?? "1970-01-01T00:00:00")
        .lte("created_at", to ?? "2999-12-31T23:59:59")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("calendar_events")
        .select(
          `id, title, type, start_time,
           user:profiles!calendar_events_user_id_fkey(id, full_name)`,
        )
        .gte("start_time", startOfToday())
        .lte("start_time", endOfToday())
        .order("start_time", { ascending: true })
        .limit(8),
      supabase
        .from("documents")
        .select(
          `id, title, category, requires_signature, uploaded_at,
           owner:profiles!documents_owner_id_fkey(id, full_name, avatar_url)`,
        )
        .gte("uploaded_at", from ?? "1970-01-01T00:00:00")
        .lte("uploaded_at", to ?? "2999-12-31T23:59:59")
        .order("uploaded_at", { ascending: false })
        .limit(8),
      // RLS limits these to requests where I'm signer/requester (or admin).
      supabase.from("document_requests").select("document_id, status, signer_id"),
      supabase
        .from("ideas")
        .select("id, title, category")
        .in("status", ["new", "backlog", "planned"])
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("notifications")
        .select("id, title, body, type, created_at")
        .eq("recipient_id", profile?.id ?? "")
        .gte("created_at", from ?? "1970-01-01T00:00:00")
        .lte("created_at", to ?? "2999-12-31T23:59:59")
        .order("created_at", { ascending: false })
        .limit(8),
      myDayStatus(),
    ]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  // Per-document signature status for the Recent documents list.
  const docSigStatus: Record<string, { pending: number; signed: number; minePending: boolean }> = {};
  for (const d of recentDocs ?? []) {
    docSigStatus[d.id] = { pending: 0, signed: 0, minePending: false };
  }
  for (const r of docRequests ?? []) {
    const cur = docSigStatus[r.document_id];
    if (!cur) continue;
    if (r.status === "pending") {
      cur.pending++;
      if (r.signer_id === profile?.id) cur.minePending = true;
    } else if (r.status === "signed") {
      cur.signed++;
    }
  }

  return (
    <Suspense fallback={null}>
      <DashboardClient
        range={range}
        firstName={firstName}
        stats={{
          approvals: pendingApprovals?.length ?? 0,
          timeOff: todayEvents?.filter((e) => e.type === "vacation" || e.type === "remote").length ?? 0,
          ideas: openIdeas?.length ?? 0,
          pendingDocs: recentDocs?.length ?? 0,
        }}
        approvals={
          pendingApprovals?.map((a) => ({
            id: a.id,
            summary: a.summary,
            type: a.type,
            created_at: a.created_at,
            requester: a.requester as unknown as { id: string; full_name: string | null; avatar_url: string | null } | null,
          })) ?? []
        }
        docs={
          recentDocs?.map((d) => ({
            id: d.id,
            title: d.title,
            category: d.category,
            requires_signature: d.requires_signature,
            uploaded_at: d.uploaded_at,
            owner: d.owner as unknown as { id: string; full_name: string | null; avatar_url: string | null } | null,
            sig_status: docSigStatus[d.id],
          })) ?? []
        }
        events={
          todayEvents?.map((e) => ({
            id: e.id,
            title: e.title,
            type: e.type,
            start_time: e.start_time,
            user: e.user as unknown as { id: string; full_name: string | null } | null,
          })) ?? []
        }
        ideas={
          openIdeas?.map((i) => ({ id: i.id, title: i.title, category: i.category })) ?? []
        }
        activity={
          activity?.map((a) => ({
            id: a.id,
            title: a.title,
            body: a.body,
            type: a.type,
            created_at: a.created_at,
          })) ?? []
        }
        reportStatus={{
          morningDone: day.ok ? day.morningDone : true,
          eodDone: day.ok ? day.eodDone : true,
          date: day.ok ? day.date : new Date().toISOString().slice(0, 10),
        }}
      />
    </Suspense>
  );
}