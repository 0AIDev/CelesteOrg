import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ReportsClient } from "@/components/reports/ReportsClient";
import { currentUserId, myDayStatus } from "@/app/actions/report-actions";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const supabase = createClient();
  const userId = await currentUserId().catch(() => null);

  const [{ data: reports }, day] = await Promise.all([
    supabase
      .from("daily_reports")
      .select(
        `id, date, morning_plan, eod_summary, blockers, status, updated_at,
         user:profiles(id, full_name, avatar_url, role_title)`,
      )
      .order("date", { ascending: false })
      .limit(60),
    myDayStatus(),
  ]);

  const feed =
    reports?.map((r) => ({
      id: r.id,
      date: r.date,
      morningPlan: r.morning_plan,
      eodSummary: r.eod_summary,
      blockers: r.blockers,
      status: r.status,
      updatedAt: r.updated_at,
      author: r.user as unknown as { id: string; full_name: string | null; avatar_url: string | null; role_title?: string | null },
    })) ?? [];

  return (
    <Suspense fallback={null}>
      <ReportsClient
        feed={feed}
        mine={{
          myId: userId,
          morningDone: day.ok ? day.morningDone : true,
          eodDone: day.ok ? day.eodDone : true,
        }}
      />
    </Suspense>
  );
}