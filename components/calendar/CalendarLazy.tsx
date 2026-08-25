"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { CalendarClient } from "./CalendarClient";

// FullCalendar is the heaviest dependency in the app (~200 kB) and is not
// SSR-friendly. Loading it client-only with a skeleton keeps /calendar from
// blocking on a server-side FullCalendar render.
const CalendarClientLazy = dynamic(
  () => import("./CalendarClient").then((m) => m.CalendarClient),
  {
    ssr: false,
    loading: () => <CalendarSkeleton />,
  },
);

type CalendarProps = ComponentProps<typeof CalendarClient>;

export default function CalendarLazy(props: CalendarProps) {
  return <CalendarClientLazy {...props} />;
}

function CalendarSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] px-6 py-5">
      <div className="mb-4 h-7 w-48 animate-pulse rounded-lg bg-gray-100" />
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-4 flex gap-2">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-8 w-24 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-8 w-24 animate-pulse rounded-lg bg-gray-100" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-50" />
          ))}
        </div>
      </div>
    </div>
  );
}
