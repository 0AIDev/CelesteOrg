"use client";

import { useEffect, useMemo, useState } from "react";
import { Sun, MoonStars, ClipboardText } from "@phosphor-icons/react";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Card } from "@/components/ui/Card";
import type { DateRange } from "@/components/ui/DateRangePicker";
import { FilterBar } from "@/components/ui/FilterBar";
import { MorningModal, EodModal } from "@/components/reports/ReportModals";
import { relativeTime } from "@/lib/utils";
import { useUrlParam } from "@/lib/useUrlParam";

type FeedItem = {
  id: string;
  date: string;
  morningPlan: string | null;
  eodSummary: string | null;
  blockers: string | null;
  status: string;
  updatedAt: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role_title?: string | null;
  };
};

export function ReportsClient({
  feed,
  mine,
}: {
  feed: FeedItem[];
  mine: { myId: string | null; morningDone: boolean; eodDone: boolean };
}) {
  const [showMorning, setShowMorning] = useState(false);
  const [showEod, setShowEod] = useState(false);

  // Range persisted in the URL (?from=YYYY-MM-DD&to=YYYY-MM-DD) so filtered
  // views can be shared by link.
  const [fromParam, setFromParam] = useUrlParam("from");
  const [toParam, setToParam] = useUrlParam("to");
  const [memberParam, setMemberParam] = useUrlParam("member");
  const [statusParam, setStatusParam] = useUrlParam("status");
  const [range, setRangeState] = useState<DateRange>({
    start: fromParam,
    end: toParam,
  });
  function setRange(r: DateRange) {
    setRangeState(r);
    setFromParam(r.start);
    setToParam(r.end);
  }
  const [member, setMemberState] = useState(memberParam ?? "");
  function setMember(v: string) {
    setMemberState(v);
    setMemberParam(v || null);
  }
  const [status, setStatusState] = useState(statusParam ?? "");
  function setStatus(v: string) {
    setStatusState(v);
    setStatusParam(v || null);
  }

  const members = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of feed) {
      if (r.author.full_name) map.set(r.author.id, r.author.full_name);
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [feed]);

  const filtered = useMemo(() => {
    return feed.filter((r) => {
      if (range.start && range.end) {
        const d = r.date.slice(0, 10); // YYYY-MM-DD
        if (d < range.start || d > range.end) return false;
      }
      if (member && r.author.id !== member) return false;
      if (status && r.status !== status) return false;
      return true;
    });
  }, [feed, range, member, status]);

  // Blocking morning modal if not submitted today yet.
  useEffect(() => {
    if (!mine.morningDone && !sessionStorage.getItem("celeste-standup-dismissed")) {
      setShowMorning(true);
    }
  }, [mine.morningDone]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-900">
            <ClipboardText className="h-5 w-5 text-gray-900" />
            Daily Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Morning standups and end-of-day summaries from the team.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMorning(true)}
            disabled={mine.morningDone}
            className="btn-secondary disabled:opacity-40"
          >
            <Sun className="h-4 w-4 text-gray-900" />
            Morning Standup
          </button>
          <button
            onClick={() => setShowEod(true)}
            disabled={mine.eodDone}
            className="btn-secondary disabled:opacity-40"
          >
            <MoonStars className="h-4 w-4 text-gray-900" />
            Submit EOD
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-sm text-gray-400">
            {range.start ? "No reports in the selected range." : "No reports yet today."}
          </p>
        </div>
      )}

      {(range.start || member || status) && (
        <p className="mb-3 text-xs text-gray-500">
          Showing {filtered.length} of {feed.length} reports.{" "}
          <button
            onClick={() => {
              setRange({ start: null, end: null });
              setMember("");
              setStatus("");
            }}
            className="font-medium text-gray-900 underline"
          >
            Clear all filters
          </button>
        </p>
      )}

      <div className="mb-4">
        <FilterBar
          range={range}
          onRangeChange={setRange}
          members={members}
          memberValue={member}
          onMemberChange={setMember}
          statuses={[
            { value: "morning", label: "Morning only" },
            { value: "eod", label: "EOD only" },
            { value: "complete", label: "Complete" },
          ]}
          statusValue={status}
          onStatusChange={setStatus}
        />
      </div>

      <div className="space-y-4">
        {filtered.map((item) => {
          const isMine = mine.myId === item.author.id;
          return (
            <Card key={item.id} hover>
              <div className="flex items-start gap-3">
                <SquircleAvatar
                  name={item.author.full_name}
                  src={item.author.avatar_url}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {item.author.full_name}
                    </span>
                    {isMine && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                        you
                      </span>
                    )}
                    <span className="ml-auto text-xs text-gray-400">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        <Sun className="h-3 w-3" /> Morning
                      </div>
                      <p className="text-sm leading-relaxed text-gray-700">
                        {item.morningPlan ??
                          "No morning plan submitted."}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        <MoonStars className="h-3 w-3" /> EOD
                      </div>
                      <p className="text-sm leading-relaxed text-gray-700">
                        {item.eodSummary ?? "No EOD submitted."}
                      </p>
                      {item.blockers && (
                        <div className="mt-2 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs text-gray-700">
                          <span className="font-semibold">Blockers: </span>
                          {item.blockers}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      {item.author.role_title ?? "Team member"}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Updated {relativeTime(item.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <MorningModal
        open={showMorning}
        onClose={() => {
          setShowMorning(false);
          sessionStorage.setItem("celeste-standup-dismissed", "1");
        }}
      />
      <EodModal open={showEod} onClose={() => setShowEod(false)} />
    </div>
  );
}