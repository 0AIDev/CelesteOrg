"use client";

import dynamic from "next/dynamic";

// @xyflow/react is ~300 kB and SSR-incompatible (references window).
// Load it client-only so it never blocks server render or other pages.
const OrgChartClient = dynamic(
  () => import("./OrgChartClient").then((m) => ({ default: m.OrgChartClient })),
  {
    ssr: false,
    loading: () => <OrgChartSkeleton />,
  },
);

type Dept = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  headcount: number;
};

type EquityByUser = Record<
  string,
  {
    total_shares: number;
    vested_shares: number;
    unvested_shares: number;
    vesting_start: string;
    cliff_months: number;
  }
>;

export default function OrgChartLazy({
  trees,
  departments,
  equity,
  currentUserId,
  myNotes,
  initialMemberId,
}: {
  trees: import("@/lib/types").OrgNode[];
  departments: Dept[];
  equity: { byUser: EquityByUser };
  currentUserId?: string | null;
  myNotes?: Record<string, string>;
  initialMemberId?: string | null;
}) {
  return (
    <OrgChartClient
      trees={trees}
      departments={departments}
      equity={equity}
      currentUserId={currentUserId}
      myNotes={myNotes}
      initialMemberId={initialMemberId}
    />
  );
}

function OrgChartSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] px-6 py-5">
      <div className="mb-6 h-7 w-32 animate-pulse rounded-lg bg-gray-100" />
      <div className="flex flex-col items-center gap-6">
        <div className="h-24 w-52 animate-pulse rounded-xl bg-gray-100" />
        <div className="flex gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 w-44 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 w-36 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
