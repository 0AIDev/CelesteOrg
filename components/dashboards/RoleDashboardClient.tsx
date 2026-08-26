"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  UsersThree,
  ShieldCheck,
  CalendarBlank,
  FileText,
  ArrowUpRight,
  TrendUp,
  Spinner,
  Check,
  X,
  ChartLineUp,
} from "@phosphor-icons/react";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Badge } from "@/components/ui/Badge";
import { reviewApproval } from "@/app/actions/approval-actions";
import { AiCostTracker } from "@/components/ai-usage/AiCostTracker"

export type DashboardData = {
  role: {
    id: string;
    title: string;
    level: number;
    department: { name: string } | null;
    profile: { id: string; full_name: string | null; avatar_url: string | null } | null;
    manager: { title: string } | null;
  };
  reports: { id: string; title: string; profile: { id: string; full_name: string | null; avatar_url: string | null } | null }[];
  approvals: { id: string; summary: string; status: string; created_at: string; requester: { full_name: string | null } | null }[];
  events: { id: string; title: string; type: string; start_time: string; end_time: string; status: string; user: { full_name: string | null } | null }[];
  docs: { id: string; title: string; category: string | null; uploaded_at: string; owner: { full_name: string | null } | null }[];
  viewerName: string | null;
};

const typeLabel: Record<string, string> = {
  vacation: "Vacation",
  remote: "Remote",
  sick: "Sick leave",
  meeting: "Meeting",
};

const eventColorMap: Record<string, string> = {
  vacation: "#0f766e",
  remote: "#b45309",
  sick: "#b91c1c",
  meeting: "#374151",
};

export function RoleDashboardClient({ data }: { data: DashboardData }) {
  const { role: r } = data;
  const router = useRouter();
  const isCEO = /chief executive officer/i.test(r.title) || /^\s*ceo\s*$/i.test(r.title);

  // Approval actions
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [localApprovals, setLocalApprovals] = useState(data.approvals);
  async function decide(id: string, decision: "approved" | "rejected") {
    setReviewing(id);
    const res = await reviewApproval({ approvalId: id, decision });
    setReviewing(null);
    if (res.ok) {
      setLocalApprovals((a) => a.filter((x) => x.id !== id));
      router.refresh();
    }
  }



  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">{r.title}</h1>
            {r.level === 1 && <Badge tone="neutral">Leadership</Badge>}
          </div>
          <div className="mt-1.5 flex items-center gap-2.5">
            <SquircleAvatar name={r.profile?.full_name} src={r.profile?.avatar_url} size="sm" />
            <span className="text-sm font-medium text-gray-700">{r.profile?.full_name ?? "Unfilled"}</span>
            {r.department && <Badge tone="neutral">{r.department.name}</Badge>}
            {r.manager && (
              <span className="text-xs text-gray-400">Reports to {r.manager.title}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <TrendUp className="h-3.5 w-3.5" />
          Level {r.level} in the org chart
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={UsersThree} label="Direct reports" value={String(data.reports.length)} />
        <Stat icon={ShieldCheck} label="Approvals to review" value={String(localApprovals.length)} />
        <Stat icon={CalendarBlank} label="Upcoming events" value={String(data.events.length)} />
        <Stat icon={FileText} label="Recent documents" value={String(data.docs.length)} />
      </div>

      {/* CEO-only: AI Cost Tracker (full realtime dashboard) */}
      {isCEO && (
        <div className="mb-6">
          <AiCostTracker />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Team */}
        <Section title="Team" href="/org-chart" hrefLabel="Org chart">
          {data.reports.length === 0 ? (
            <Empty text="No direct reports yet." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.reports.map((m) => (
                <li key={m.id} className="flex items-center gap-2.5 py-2.5">
                  <SquircleAvatar name={m.profile?.full_name} src={m.profile?.avatar_url} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-gray-900">
                      {m.profile?.full_name ?? "Unfilled"}
                    </p>
                    <p className="truncate text-[11.5px] text-gray-400">{m.title}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Pending approvals with actions */}
        <Section title="Approvals to review" href="/approvals" hrefLabel="Approvals">
          {localApprovals.length === 0 ? (
            <Empty text="Nothing waiting for approval." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {localApprovals.map((a) => (
                <li key={a.id} className="flex items-center gap-2.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-gray-900">{a.summary}</p>
                    <p className="text-[11.5px] text-gray-400">
                      {a.requester?.full_name ?? "Unknown"} · {relative(a.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      disabled={reviewing === a.id}
                      onClick={() => decide(a.id, "approved")}
                      className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                      title="Approve"
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
                      title="Reject"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Upcoming events */}
        <Section title="Upcoming events" href="/calendar" hrefLabel="Calendar">
          {data.events.length === 0 ? (
            <Empty text="No events in the next two weeks." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.events.map((e) => (
                <li key={e.id} className="flex items-center gap-2.5 py-2.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: eventColorMap[e.type] ?? "#374151" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-gray-900">{e.title}</p>
                    <p className="text-[11.5px] text-gray-400">
                      {format(new Date(e.start_time), "EEE, MMM d · HH:mm")} · {typeLabel[e.type] ?? e.type}
                      {e.user?.full_name ? ` · ${e.user.full_name}` : ""}
                    </p>
                  </div>
                  {e.status === "pending" && <Badge tone="neutral">Pending</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Recent documents */}
        <Section title="Recent documents" href="/documents" hrefLabel="Documents">
          {data.docs.length === 0 ? (
            <Empty text="No documents yet." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.docs.map((d) => (
                <li key={d.id} className="flex items-center gap-2.5 py-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-gray-900">{d.title}</p>
                    <p className="text-[11.5px] text-gray-400">
                      {d.category ?? "General"} · {d.owner?.full_name ?? "Unknown"}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400">{relative(d.uploaded_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {data.viewerName && (
        <p className="mt-6 text-[11px] text-gray-400">
          You&apos;re viewing this as {data.viewerName} — every teammate can see every dashboard.
        </p>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
      <Icon className="h-4 w-4 text-gray-400" />
      <p className="mt-2 text-xl font-semibold tabular-nums text-gray-900">{value}</p>
      <p className="text-[11px] font-medium text-gray-400">{label}</p>
    </div>
  );
}

function Section({
  title,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-gray-900">{title}</h2>
        <Link
          href={href}
          className="flex items-center gap-1 text-[11.5px] font-medium text-gray-400 transition-colors hover:text-gray-900"
        >
          {hrefLabel}
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-xs text-gray-400">{text}</p>;
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
