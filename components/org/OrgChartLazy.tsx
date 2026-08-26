"use client";

import dynamic from "next/dynamic";
import type { OrgNode } from "@/lib/types";

const OrgChartClient = dynamic(() => import("./OrgChartClient").then(m => ({ default: m.OrgChartClient })), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-12rem)] w-full items-center justify-center">
      <p className="text-sm text-gray-400">Loading org chart…</p>
    </div>
  ),
});

type Dept = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  headcount: number;
};

export function OrgChartLazy({
  trees,
  departments,
  equity,
  currentUserId,
  myNotes,
  initialMemberId,
}: {
  trees: OrgNode[];
  departments: Dept[];
  equity: {
    byUser: Record<
      string,
      {
        total_shares: number;
        vested_shares: number;
        unvested_shares: number;
        vesting_start: string;
        cliff_months: number;
      }
    >;
  };
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
