"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Spinner, Tray, ClockCounterClockwise, ShieldCheck } from "@phosphor-icons/react";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { reviewApproval } from "@/app/actions/approval-actions";
import { relativeTime } from "@/lib/utils";

type ApprovalItem = {
  id: string;
  summary: string;
  type: string;
  created_at: string;
  requester: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

type HistoryItem = ApprovalItem & { status: string; reviewed_at: string | null };

// Monochrome: all type badges render neutral (gray).
const TYPE_TONE: Record<string, "neutral"> = {
  timeoff: "neutral",
  onboarding: "neutral",
  document: "neutral",
  equity: "neutral",
  general: "neutral",
};

export function ApprovalsClient({
  firstName,
  pending: initialPending,
  history,
}: {
  firstName: string;
  pending: ApprovalItem[];
  history: HistoryItem[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(initialPending);
  const [reviewing, setReviewing] = useState<string | null>(null);

  async function decide(id: string, decision: "approved" | "rejected") {
    setReviewing(id);
    const res = await reviewApproval({ approvalId: id, decision });
    setReviewing(null);
    if (res.ok) {
      setPending((p) => p.filter((x) => x.id !== id));
      router.refresh();
    }
  }

  const approvedCount = history.filter((h) => h.status === "approved").length;
  const rejectedCount = history.length - approvedCount;

  return (
    <div className="mx-auto max-w-5xl px-6 py-5">
      {/* Header */}
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-gray-900">
            <ShieldCheck className="h-4 w-4 text-gray-900" />
            Approvals
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Inbox di {firstName} — tutto ciò che aspetta il tuo ok.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="flex items-center gap-3 !p-4">
          <Tray className="h-4 w-4 shrink-0 text-gray-900" />
          <div>
            <p className="text-[11px] font-medium text-gray-500">In attesa</p>
            <p className="text-xl font-semibold tabular-nums text-gray-900">{pending.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 !p-4">
          <Check className="h-4 w-4 shrink-0 text-gray-900" />
          <div>
            <p className="text-[11px] font-medium text-gray-500">Approvati</p>
            <p className="text-xl font-semibold tabular-nums text-gray-900">{approvedCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 !p-4">
          <X className="h-4 w-4 shrink-0 text-gray-900" />
          <div>
            <p className="text-[11px] font-medium text-gray-500">Rifiutati</p>
            <p className="text-xl font-semibold tabular-nums text-gray-900">{rejectedCount}</p>
          </div>
        </Card>
      </div>

      {/* Pending inbox */}
      <Card padding={false} className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
          <h2 className="text-[13px] font-semibold text-gray-900">Da rivedere</h2>
          <span className="text-[11px] tabular-nums text-gray-400">{pending.length} open</span>
        </div>
        {pending.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-gray-400">
            Tutto in pari — nessuna approvazione in attesa.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pending.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <SquircleAvatar name={a.requester?.full_name} src={a.requester?.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-gray-900">{a.summary}</p>
                  <p className="mt-0.5 flex items-center gap-2 truncate text-[11.5px] text-gray-400">
                    {a.requester?.full_name ?? "Unknown"} · {relativeTime(a.created_at)}
                    <Badge tone={TYPE_TONE[a.type] ?? "neutral"} className="capitalize">
                      {a.type}
                    </Badge>
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    disabled={reviewing === a.id}
                    onClick={() => decide(a.id, "approved")}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-[12.5px] font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    {reviewing === a.id ? (
                      <Spinner className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Approve
                  </button>
                  <button
                    disabled={reviewing === a.id}
                    onClick={() => decide(a.id, "rejected")}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-[12.5px] font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* History */}
      <Card padding={false} className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
            <ClockCounterClockwise className="h-3.5 w-3.5 text-gray-400" />
            Review history
          </h2>
        </div>
        {history.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-400">Nessuna decisione registrata.</p>
        ) : (
          <div className="max-h-[26rem] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead className="text-right">Reviewed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <SquircleAvatar name={h.requester?.full_name} src={h.requester?.avatar_url} size="xs" />
                        <span className="truncate text-[13px]">{h.requester?.full_name ?? "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate font-medium text-gray-900">{h.summary}</TableCell>
                    <TableCell>
                      <Badge tone={TYPE_TONE[h.type] ?? "neutral"} className="capitalize">
                        {h.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge tone="neutral" className="capitalize">
                        {h.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-gray-400">
                      {relativeTime(h.reviewed_at ?? h.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
