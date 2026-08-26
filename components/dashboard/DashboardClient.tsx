"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sun,
  MoonStars,
  Lightbulb,
  CalendarPlus,
  Check,
  X,
  Spinner,
  FileText,
  ShieldCheck,
  ArrowRight,
  PenNib,
} from "@phosphor-icons/react";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { reviewApproval } from "@/app/actions/approval-actions";
import { MorningModal, EodModal } from "@/components/reports/ReportModals";
import { DateRangePicker, type DateRange } from "@/components/ui/DateRangePicker";
import { relativeTime } from "@/lib/utils";
import { useUrlParam } from "@/lib/useUrlParam";

type ApprovalItem = {
  id: string;
  summary: string;
  type: string;
  created_at: string;
  requester: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

type DocItem = {
  id: string;
  title: string;
  category: string | null;
  requires_signature: boolean;
  uploaded_at: string;
  owner: { id: string; full_name: string | null; avatar_url: string | null } | null;
  sig_status?: { pending: number; signed: number; minePending: boolean };
};

type EventItem = {
  id: string;
  title: string;
  type: string;
  start_time: string;
  user: { id: string; full_name: string | null } | null;
};

type ActivityItem = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  created_at: string;
};

export function DashboardClient({
  range: initialRange,
  firstName,
  stats,
  approvals,
  docs,
  events,
  ideas,
  activity,
  reportStatus,
}: {
  range: DateRange;
  firstName: string;
  stats: { approvals: number; timeOff: number; ideas: number; pendingDocs: number };
  approvals: ApprovalItem[];
  docs: DocItem[];
  events: EventItem[];
  ideas: { id: string; title: string; category: string | null }[];
  activity: ActivityItem[];
  reportStatus: { morningDone: boolean; eodDone: boolean; date: string };
}) {
  const router = useRouter();
  const [, setFromParam] = useUrlParam("from");
  const [, setToParam] = useUrlParam("to");
  const [range, setRange] = useState<DateRange>(initialRange);
  function onRangeChange(r: DateRange) {
    setRange(r);
    setFromParam(r.start);
    setToParam(r.end);
    router.refresh(); // re-run the server queries with the new bounds
  }
  const [showMorning, setShowMorning] = useState(false);
  const [showEod, setShowEod] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [localApprovals, setLocalApprovals] = useState(approvals);

  async function decide(id: string, decision: "approved" | "rejected") {
    setReviewing(id);
    const res = await reviewApproval({ approvalId: id, decision });
    setReviewing(null);
    if (res.ok) {
      setLocalApprovals((a) => a.filter((x) => x.id !== id));
      router.refresh();
    }
  }

  const actions = [
    {
      label: "Morning Standup",
      icon: <Sun className="h-4 w-4 text-gray-900" />,
      disabled: reportStatus.morningDone || reportStatus.date !== todayStr(),
      onClick: () => (reportStatus.morningDone ? undefined : setShowMorning(true)),
    },
    {
      label: "Submit EOD",
      icon: <MoonStars className="h-4 w-4 text-gray-900" />,
      disabled: reportStatus.eodDone,
      onClick: () => setShowEod(true),
    },
    {
      label: "New Idea",
      icon: <Lightbulb className="h-4 w-4 text-gray-900" />,
      onClick: () => router.push("/ideas?new=1"),
    },
    {
      label: "Request Time Off",
      icon: <CalendarPlus className="h-4 w-4 text-gray-900" />,
      onClick: () => router.push("/calendar?new=1"),
    },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
      {/* Header — one glance */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">
            Welcome back, {firstName}
          </h1>
          <p className="text-xs text-gray-500">Here&apos;s what&apos;s happening at Celeste today.</p>
        </div>
        <div className="flex items-center gap-3">
          {range.start && (
            <span className="hidden text-xs text-gray-400 sm:block">
              Filtered by date range
            </span>
          )}
          <DateRangePicker
            value={range}
            onChange={onRangeChange}
            placeholder="Filter by date…"
            className="w-full sm:w-44"
          />
        </div>
      </div>

      {/* Stats — compact tiles */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatCard label="Pending approvals" value={stats.approvals} href="#approvals" icon={<ShieldCheck className="h-4 w-4" />} tone="text-gray-900" />
        <StatCard label="Time off this week" value={stats.timeOff} href="/calendar" icon={<CalendarPlus className="h-4 w-4" />} tone="text-gray-900" />
        <StatCard label="Open ideas" value={stats.ideas} href="/ideas" icon={<Lightbulb className="h-4 w-4" />} tone="text-gray-900" />
        <StatCard label="Recent documents" value={stats.pendingDocs} href="/documents" icon={<FileText className="h-4 w-4" />} tone="text-gray-900" />
      </div>

      {/* Main dense grid */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* LEFT — schedule + approvals + docs */}
        <div className="space-y-4 lg:col-span-2">
          <Card padding={false} className="overflow-hidden">
            <SectionHeader
              title="Today's schedule"
              right={
                <button
                  onClick={() => router.push("/calendar")}
                  className="text-xs font-medium text-gray-900 underline"
                >
                  Calendar →
                </button>
              }
            />
            {events.length === 0 ? (
              <p className="px-4 py-4 text-center text-sm text-gray-400">
                Nothing on the calendar today.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {events.slice(0, 4).map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        e.type === "remote"
                          ? "bg-gray-400"
                          : e.type === "sick"
                            ? "bg-gray-400"
                            : e.type === "vacation"
                              ? "bg-gray-400"
                              : "bg-gray-400"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-gray-800">
                      {e.title}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-gray-400">
                      {new Date(e.start_time).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="hidden w-24 truncate text-right text-xs text-gray-400 sm:block">
                      {e.user?.full_name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Approvals + recent docs side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card padding={false} className="overflow-hidden" >
              <div id="approvals">
                <SectionHeader title={`Approvals (${localApprovals.length})`} />
              </div>
              {localApprovals.length === 0 ? (
                <p className="px-4 py-5 text-center text-sm text-gray-400">You&apos;re all caught up.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {localApprovals.slice(0, 4).map((a) => (
                    <li key={a.id} className="px-4 py-2">
                      <div className="flex items-start gap-2.5">
                        <SquircleAvatar
                          name={a.requester?.full_name}
                          src={a.requester?.avatar_url}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-gray-900">{a.summary}</p>
                          <p className="truncate text-[11px] text-gray-400">
                            {a.requester?.full_name} ·{" "}
                            {new Date(a.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            disabled={reviewing === a.id}
                            onClick={() => decide(a.id, "approved")}
                            className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                            aria-label="Approve"
                          >
                            {reviewing === a.id ? (
                              <Spinner className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            disabled={reviewing === a.id}
                            onClick={() => decide(a.id, "rejected")}
                            className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                            aria-label="Reject"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card padding={false} className="overflow-hidden">
              <SectionHeader title="Recent documents" />
              {docs.length === 0 ? (
                <p className="px-4 py-5 text-center text-sm text-gray-400">No documents yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {docs.slice(0, 4).map((d) => {
                    const st = d.sig_status;
                    return (
                      <li key={d.id} className="flex items-center gap-2.5 px-4 py-2">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-gray-900">{d.title}</p>
                          <p className="truncate text-[11px] text-gray-400">
                            {d.owner?.full_name} · {new Date(d.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                        {d.requires_signature && st && (
                          <span
                            className={`flex shrink-0 items-center gap-0.5 text-[11px] font-medium ${
                              st.minePending ? "text-gray-900" : "text-gray-500"
                            }`}
                          >
                            <PenNib className="h-3 w-3" />
                            {st.minePending
                              ? "awaiting your signature"
                              : st.pending > 0
                                ? `awaiting ${st.pending}/${st.pending + st.signed} signatures`
                                : "fully signed"}
                          </span>
                        )}
                        {d.category && <Badge tone="neutral">{d.category}</Badge>}
                      </li>
                    );
                  })}
                </ul>
              )}
              <button
                onClick={() => router.push("/documents")}
                className="flex w-full items-center justify-center gap-1 border-t border-gray-100 py-2 text-[13px] font-medium text-gray-900 hover:bg-gray-50"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Card>
          </div>
        </div>

        {/* RIGHT rail — quick actions + activity */}
        <div className="space-y-4">
          <Card padding={false} className="overflow-hidden">
            <SectionHeader title="Quick actions" />
            <div className="grid grid-cols-2 gap-1.5 p-2.5">
              {actions.map((a) => (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  disabled={a.disabled}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-2 text-left text-[12.5px] font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40"
                >
                  {a.icon}
                  <span className="truncate">{a.label}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card padding={false} className="overflow-hidden">
            <SectionHeader title="Activity" />
            {activity.length === 0 ? (
              <p className="px-4 py-4 text-center text-sm text-gray-400">No activity yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {activity.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-start gap-2.5 px-3.5 py-2">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        a.type === "approval"
                          ? "bg-gray-400"
                          : a.type === "idea"
                            ? "bg-gray-400"
                            : a.type === "invite"
                              ? "bg-gray-400"
                              : "bg-gray-300"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-gray-900">{a.title}</p>
                      {a.body && <p className="truncate text-[11px] text-gray-400">{a.body}</p>}
                    </div>
                    <span className="shrink-0 text-[11px] text-gray-400">
                      {relativeTime(a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <MorningModal open={showMorning} onClose={() => setShowMorning(false)} />
      <EodModal open={showEod} onClose={() => setShowEod(false)} />
    </div>
  );
}

function SectionHeader({
  title,
  right,
}: {
  title: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
      <h2 className="text-[13px] font-semibold text-gray-900">{title}</h2>
      {right}
    </div>
  );
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function StatCard({
  label,
  value,
  href,
  icon,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  icon: React.ReactNode;
  tone: string;
}) {
  const router = useRouter();
  return (
    <button onClick={() => router.push(href)} className="card card-hover flex items-center gap-3 px-4 py-3 text-left">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 ${tone}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-gray-500">{label}</p>
        <p className="text-lg font-semibold tabular-nums text-gray-900">{value}</p>
      </div>
    </button>
  );
}