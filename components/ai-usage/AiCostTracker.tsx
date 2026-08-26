"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Coin,
  Lightning,
  ArrowUpRight,
  TrendUp,
  Spinner,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────
type UsageLog = {
  id: string;
  model_name: string;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  latency_ms: number;
  status: string;
  created_at: string;
};

type ModelBreakdown = {
  model: string;
  provider: string;
  calls: number;
  tokens: number;
  cost: number;
};

// ── Cost per 1K tokens by model (USD) ───────────────────────────────────────
// These are approximate — update as pricing changes.
const COST_PER_1K: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "claude-3.5-sonnet": { input: 0.003, output: 0.015 },
  "claude-3-haiku": { input: 0.00025, output: 0.00125 },
  "llama-3.3-70b-versatile": { input: 0, output: 0 }, // Groq free
  "meta/muse-glimmer-30b": { input: 0, output: 0 },   // NVIDIA free tier
  "nvidia/nemotron-3.5-lightning-30b-a3b": { input: 0, output: 0 },
};

export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const rates = COST_PER_1K[model];
  if (!rates) return 0;
  return (
    (promptTokens / 1000) * rates.input +
    (completionTokens / 1000) * rates.output
  );
}

// ── Formatting helpers ──────────────────────────────────────────────────────
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtCost(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

// ── Main component ──────────────────────────────────────────────────────────
export function AiCostTracker({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  // Fetch current month's logs
  useEffect(() => {
    const sb = createClient();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    sb.from("ai_usage_logs")
      .select("*")
      .gte("created_at", monthStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setLogs((data as UsageLog[]) ?? []);
        setLoading(false);
      });

    // Realtime subscription
    const channel = sb
      .channel("ai-cost-tracker")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ai_usage_logs" },
        (payload) => {
          const row = payload.new as UsageLog;
          // Only include if current month
          const rowDate = new Date(row.created_at);
          if (rowDate >= monthStart) {
            setLogs((prev) => [row, ...prev].slice(0, 500));
          }
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // ── Aggregates ──────────────────────────────────────────────────────────
  const agg = useMemo(() => {
    const totalTokens = logs.reduce((a, b) => a + b.total_tokens, 0);
    const totalCost = logs.reduce((a, b) => a + b.estimated_cost_usd, 0);
    const totalCalls = logs.length;
    const avgLatency = totalCalls
      ? Math.round(logs.reduce((a, b) => a + b.latency_ms, 0) / totalCalls)
      : 0;
    const errors = logs.filter((l) => l.status !== "ok").length;

    // Cost by model
    const byModel = new Map<string, ModelBreakdown>();
    for (const log of logs) {
      const key = log.model_name;
      const existing = byModel.get(key) ?? {
        model: log.model_name,
        provider: log.provider,
        calls: 0,
        tokens: 0,
        cost: 0,
      };
      existing.calls += 1;
      existing.tokens += log.total_tokens;
      existing.cost += log.estimated_cost_usd;
      byModel.set(key, existing);
    }
    const models = Array.from(byModel.values()).sort((a, b) => b.cost - a.cost);

    // Daily cost for sparkline (last 30 days)
    const dailyCosts: { day: string; cost: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const dayCost = logs
        .filter((l) => l.created_at.slice(0, 10) === dayStr)
        .reduce((a, b) => a + b.estimated_cost_usd, 0);
      dailyCosts.push({ day: dayStr, cost: dayCost });
    }
    const maxDailyCost = Math.max(...dailyCosts.map((d) => d.cost), 0.0001);

    // Cost by provider
    const byProvider = new Map<string, number>();
    for (const log of logs) {
      byProvider.set(log.provider, (byProvider.get(log.provider) ?? 0) + log.estimated_cost_usd);
    }
    const providers = Array.from(byProvider.entries()).sort((a, b) => b[1] - a[1]);

    return {
      totalTokens,
      totalCost,
      totalCalls,
      avgLatency,
      errors,
      models,
      dailyCosts,
      maxDailyCost,
      providers,
    };
  }, [logs]);

  const monthLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className={cn("rounded-2xl border border-gray-100 bg-white p-5", className)}>
        <div className="flex items-center gap-3 py-8">
          <Spinner className="h-4 w-4 animate-spin text-gray-400" />
          <span className="text-sm text-gray-400">Loading usage data…</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-gray-100 bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Coin className="h-4 w-4 text-gray-400" />
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">
              AI Cost Tracker
            </h2>
            <p className="text-[11px] text-gray-400">{monthLabel}</p>
          </div>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
            live
              ? "border-gray-300 bg-gray-100 text-gray-600"
              : "border-gray-200 bg-gray-50 text-gray-400",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              live ? "animate-pulse bg-gray-900" : "bg-gray-400",
            )}
          />
          {live ? "Live" : "Connecting…"}
        </span>
      </div>

      {/* Big stats */}
      <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100 sm:grid-cols-4">
        <StatCell
          icon={<Coin className="h-3.5 w-3.5" />}
          label="Total cost"
          value={fmtCost(agg.totalCost)}
          accent
        />
        <StatCell
          icon={<Lightning className="h-3.5 w-3.5" />}
          label="Total tokens"
          value={fmtTokens(agg.totalTokens)}
        />
        <StatCell
          icon={<ArrowUpRight className="h-3.5 w-3.5" />}
          label="API calls"
          value={agg.totalCalls.toLocaleString()}
        />
        <StatCell
          icon={<TrendUp className="h-3.5 w-3.5" />}
          label="Avg latency"
          value={`${agg.avgLatency}ms`}
          sub={agg.errors > 0 ? `${agg.errors} errors` : undefined}
        />
      </div>

      {/* Daily cost sparkline */}
      {!compact && (
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="mb-2 text-[11px] font-medium text-gray-400">
            Daily cost — last 30 days
          </p>
          <div className="flex h-16 items-end gap-px">
            {agg.dailyCosts.map((d, i) => (
              <div key={i} className="group relative flex-1">
                <div
                  className="w-full rounded-t bg-gray-800 transition-all hover:bg-gray-600"
                  style={{
                    height: `${Math.max((d.cost / agg.maxDailyCost) * 100, d.cost > 0 ? 4 : 1)}%`,
                  }}
                  title={`${d.day}: ${fmtCost(d.cost)}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-gray-400">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>
      )}

      {/* Breakdown by model */}
      <div className="px-5 py-4">
        <p className="mb-3 text-[11px] font-medium text-gray-400">
          Cost by model
        </p>
        {agg.models.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-gray-400">
            No API calls this month yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {agg.models.map((m) => {
              const maxCost = agg.models[0]?.cost || 1;
              return (
                <div key={m.model} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-[12px] font-medium text-gray-800">
                        {m.model}
                      </span>
                      <span className="shrink-0 pl-2 text-[11px] tabular-nums text-gray-500">
                        {fmtCost(m.cost)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gray-800"
                          style={{
                            width: `${Math.max((m.cost / maxCost) * 100, 2)}%`,
                          }}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] tabular-nums text-gray-400">
                        {fmtTokens(m.tokens)} tokens · {m.calls} calls
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Provider summary */}
      {!compact && agg.providers.length > 0 && (
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="mb-2 text-[11px] font-medium text-gray-400">
            Cost by provider
          </p>
          <div className="flex flex-wrap gap-3">
            {agg.providers.map(([provider, cost]) => (
              <div
                key={provider}
                className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2"
              >
                <span className="text-[12px] font-medium capitalize text-gray-700">
                  {provider}
                </span>
                <span className="text-[11px] tabular-nums text-gray-500">
                  {fmtCost(cost)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stat cell ───────────────────────────────────────────────────────────────
function StatCell({
  icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3.5">
      <span className="text-gray-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-medium text-gray-400">{label}</p>
        <p
          className={cn(
            "text-lg font-semibold tabular-nums",
            accent ? "text-gray-900" : "text-gray-800",
          )}
        >
          {value}
        </p>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}
