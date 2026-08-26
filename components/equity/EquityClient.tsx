"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { TrendUp, Lock, Coin, Plus, PencilSimple, Trash, X, Spinner } from "@phosphor-icons/react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { CustomSelect } from "@/components/ui/CustomSelect";
import {
  createEquityGrant,
  updateEquityGrant,
  deleteEquityGrant,
} from "@/app/actions/equity-actions";

type Grant = {
  id: string;
  user_id: string;
  total_shares: number;
  vested_shares: number;
  unvested_shares: number;
  vesting_start: string;
  cliff_months: number;
  schedule_type: string;
  user: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

type Member = { id: string; full_name: string | null; avatar_url: string | null };

type Draft = {
  user_id: string;
  total_shares: string;
  vested_shares: string;
  vesting_start: string;
  cliff_months: string;
  schedule_type: string;
};

export function EquityClient({
  currentUserId,
  isAdminOrFounder,
  grants,
  members,
}: {
  currentUserId: string | null;
  isAdminOrFounder: boolean;
  grants: Grant[];
  members: Member[];
}) {
  const myGrant = grants.find((g) => g.user_id === currentUserId) ?? null;
  const teamGrants = isAdminOrFounder ? grants : [];
  const [modal, setModal] = useState<{ grant: Grant | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmGrant, setConfirmGrant] = useState<Grant | null>(null);

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.id,
        label: m.full_name ?? "Unnamed",
      })),
    [members],
  );

  function openCreate() {
    setModal({ grant: null });
    setErr("");
  }
  function openEdit(grant: Grant) {
    setModal({ grant });
    setErr("");
  }

  async function submit(draft: Draft) {
    setBusy(true);
    setErr("");
    const payload = {
      user_id: draft.user_id,
      total_shares: Number(draft.total_shares) || 0,
      vested_shares: Number(draft.vested_shares) || 0,
      vesting_start: draft.vesting_start || undefined,
      cliff_months: Number(draft.cliff_months) || 12,
      schedule_type: draft.schedule_type as "monthly" | "yearly",
    };
    const res = modal?.grant
      ? await updateEquityGrant(modal.grant.id, payload)
      : await createEquityGrant(payload);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setModal(null);
    window.location.reload();
  }

  async function remove(grant: Grant) {
    setBusy(true);
    const res = await deleteEquityGrant(grant.id);
    setBusy(false);
    setConfirmGrant(null);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-5">
      {/* Header */}
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-gray-900">
            <Coin className="h-4 w-4 text-gray-900" />
            Equity
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Your grant, vesting, and cap table. Visible only to you and the founders.
          </p>
        </div>
        <Badge tone="neutral">
          <Lock className="mr-1 inline h-3 w-3" /> Private
        </Badge>
      </div>

      {/* My grant */}
      {myGrant ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <BigStat label="Total shares" value={myGrant.total_shares.toLocaleString()} />
            <BigStat label="Vested" value={myGrant.vested_shares.toLocaleString()} />
            <BigStat label="Unvested" value={myGrant.unvested_shares.toLocaleString()} />
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
                  <TrendUp className="h-4 w-4 text-gray-400" />
                  Vesting schedule
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Started {format(new Date(myGrant.vesting_start), "MMM yyyy")} · {myGrant.cliff_months}-month cliff ·{" "}
                  {myGrant.schedule_type}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-gray-900">
                {pctVested(myGrant)}% vested
              </span>
            </div>
            <VestingChart series={vestingSeries(myGrant)} />
          </Card>
        </div>
      ) : (
        <Card className="flex flex-col items-center py-14 text-center">
          <TrendUp className="mb-3 h-9 w-9 text-gray-300" />
          <p className="text-sm font-medium text-gray-900">No equity grant on file</p>
          <p className="mt-1 max-w-sm text-xs text-gray-500">
            Your grant will appear here once the company issues it. Grants are visible only to you and the founders.
          </p>
        </Card>
      )}

      {/* Cap table — founders/admins only */}
      {isAdminOrFounder && (
        <Card padding={false} className="mt-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <h2 className="text-[13px] font-semibold text-gray-900">Cap table</h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] tabular-nums text-gray-400">{teamGrants.length} grants</span>
              <button
                onClick={openCreate}
                className="flex items-center gap-1 rounded-lg bg-gray-900 px-2.5 py-1 text-[12px] font-medium text-white transition-colors hover:bg-gray-700"
              >
                <Plus className="h-3.5 w-3.5" />
                New grant
              </button>
            </div>
          </div>
          {teamGrants.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-400">
              No grants issued yet — create the first one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Vested</TableHead>
                  <TableHead className="text-right">Unvested</TableHead>
                  <TableHead className="text-right">Vested %</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamGrants.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <SquircleAvatar name={g.user?.full_name} src={g.user?.avatar_url} size="xs" />
                        <span className="truncate text-[13px] font-medium text-gray-900">
                          {g.user?.full_name ?? "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{g.total_shares.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {g.vested_shares.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-gray-500">
                      {g.unvested_shares.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{pctVested(g)}%</TableCell>
                    <TableCell className="text-gray-400">
                      {format(new Date(g.vesting_start), "MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => openEdit(g)}
                          title="Edit grant"
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        >
                          <PencilSimple className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmGrant(g)}
                          title="Delete grant"
                          disabled={busy}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Create / edit modal */}
      {modal && (
        <GrantModal
          grant={modal.grant}
          members={memberOptions}
          currentUserId={currentUserId ?? ""}
          busy={busy}
          err={err}
          onClose={() => setModal(null)}
          onSubmit={submit}
        />
      )}

      {/* Custom delete confirm modal */}
      {confirmGrant && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setConfirmGrant(null)}
        >
          <div
            className="w-full max-w-sm animate-fade-in rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-semibold text-gray-900">Delete grant</h4>
            <p className="mt-1.5 text-[13px] text-gray-500">
              Delete {confirmGrant.user?.full_name ?? "this"} grant? This cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                onClick={() => setConfirmGrant(null)}
                className="text-sm font-medium text-gray-400 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => void remove(confirmGrant)}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? <Spinner className="h-3.5 w-3.5 animate-spin" /> : <Trash className="h-3.5 w-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GrantModal({
  grant,
  members,
  currentUserId,
  busy,
  err,
  onClose,
  onSubmit,
}: {
  grant: Grant | null;
  members: { value: string; label: string }[];
  currentUserId: string;
  busy: boolean;
  err: string;
  onClose: () => void;
  onSubmit: (draft: Draft) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    grant
      ? {
          user_id: grant.user_id,
          total_shares: String(grant.total_shares),
          vested_shares: String(grant.vested_shares),
          vesting_start: grant.vesting_start.slice(0, 10),
          cliff_months: String(grant.cliff_months),
          schedule_type: grant.schedule_type,
        }
      : {
          user_id: currentUserId,
          total_shares: "",
          vested_shares: "0",
          vesting_start: new Date().toISOString().slice(0, 10),
          cliff_months: "12",
          schedule_type: "monthly",
        },
  );

  const valid = Number(draft.total_shares) > 0 && !!draft.user_id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            {grant ? "Edit grant" : "New grant"}
          </h3>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!grant && (
          <>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Member</label>
            <CustomSelect
              value={draft.user_id}
              onValueChange={(v) => setDraft({ ...draft, user_id: v })}
              options={members}
              placeholder="Select member…"
            />
          </>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Total shares</label>
            <input
              type="number"
              min={0}
              value={draft.total_shares}
              onChange={(e) => setDraft({ ...draft, total_shares: e.target.value })}
              className="input"
              placeholder="e.g. 100000"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Vested shares</label>
            <input
              type="number"
              min={0}
              value={draft.vested_shares}
              onChange={(e) => setDraft({ ...draft, vested_shares: e.target.value })}
              className="input"
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Vesting start</label>
            <input
              type="date"
              value={draft.vesting_start}
              onChange={(e) => setDraft({ ...draft, vesting_start: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Cliff (months)</label>
            <input
              type="number"
              min={0}
              max={120}
              value={draft.cliff_months}
              onChange={(e) => setDraft({ ...draft, cliff_months: e.target.value })}
              className="input"
            />
          </div>
        </div>

        <label className="mb-1.5 mt-4 block text-[13px] font-medium text-gray-700">Schedule</label>
        <CustomSelect
          value={draft.schedule_type}
          onValueChange={(v) => setDraft({ ...draft, schedule_type: v || "monthly" })}
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly" },
          ]}
        />

        {err && <p className="mt-3 text-xs text-gray-600">{err}</p>}

        <div className="mt-5 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-2 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(draft)}
            disabled={busy || !valid}
            className="btn-primary disabled:opacity-50"
          >
            {busy ? <Spinner className="h-4 w-4 animate-spin" /> : grant ? "Save changes" : "Issue grant"}
          </button>
        </div>
      </div>
    </div>
  );
}

function pctVested(g: Grant): number {
  return g.total_shares > 0 ? Math.round((g.vested_shares / g.total_shares) * 100) : 0;
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">{value}</p>
    </div>
  );
}

// Compute cumulative vested shares month by month.
function vestingSeries(grant: Grant): { month: number; shares: number }[] {
  const { total_shares: total, cliff_months: cliff } = grant;
  const months = Math.max(Math.ceil(cliff), 36);
  const monthlyPortion = total / months;
  const series = [];
  for (let m = 1; m <= months; m++) {
    let cumulative: number;
    if (m <= cliff) {
      cumulative = m === cliff ? cliff * monthlyPortion : 0;
    } else {
      cumulative = m * monthlyPortion;
    }
    series.push({ month: m, shares: Math.round(Math.min(cumulative, total)) });
  }
  return series;
}

function VestingChart({ series }: { series: { month: number; shares: number }[] }) {
  if (series.length === 0) return null;
  const W = 600;
  const H = 180;
  const PAD = 24;
  const max = Math.max(...series.map((s) => s.shares), 1);
  const x = (m: number) => PAD + (m / series.length) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const pts = series.map((s, i) => `${x(i + 1).toFixed(1)},${y(s.shares).toFixed(1)}`);
  const last = series[series.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      <defs>
        <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#111827" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#111827" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={PAD}
          x2={W - PAD}
          y1={PAD + (1 - f) * (H - PAD * 2)}
          y2={PAD + (1 - f) * (H - PAD * 2)}
          stroke="#e7e9ee"
          strokeDasharray="3 3"
        />
      ))}
      <polygon points={`${x(1)},${y(0)} ${pts.join(" ")} ${x(series.length)},${y(0)}`} fill="url(#eqfill)" />
      <polyline points={pts.join(" ")} fill="none" stroke="#111827" strokeWidth={2.5} strokeLinecap="round" />
      <text x={x(last.month)} y={y(last.shares) - 10} textAnchor="end" className="fill-gray-500 text-[11px]">
        {last.shares.toLocaleString()}
      </text>
      <text x={W - PAD} y={H - 8} textAnchor="end" className="fill-gray-400 text-[11px]">
        Month
      </text>
    </svg>
  );
}
