"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { TrendUp, Lock, Coin } from "@phosphor-icons/react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

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

export function EquityClient({
  currentUserId,
  isAdminOrFounder,
  grants,
}: {
  currentUserId: string | null;
  isAdminOrFounder: boolean;
  grants: Grant[];
}) {
  const myGrant = grants.find((g) => g.user_id === currentUserId) ?? null;
  const teamGrants = isAdminOrFounder ? grants : [];

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
            Il tuo grant, il vesting e la cap table. Visibile solo a te e ai founder.
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
            Il tuo grant apparirà qui quando verrà emesso dalla company. I grant sono visibili solo a te e ai founder.
          </p>
        </Card>
      )}

      {/* Cap table — founders/admins only */}
      {isAdminOrFounder && (
        <Card padding={false} className="mt-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <h2 className="text-[13px] font-semibold text-gray-900">Cap table</h2>
            <span className="text-[11px] tabular-nums text-gray-400">{teamGrants.length} grants</span>
          </div>
          {teamGrants.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-400">Nessun grant emesso finora.</p>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
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
