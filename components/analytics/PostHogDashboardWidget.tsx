"use client";

import { useEffect, useState, useCallback } from "react";
import {
  TrendUp,
  TrendDown,
  Users,
  Lightning,
  Eye,
  Clock,
  ArrowRight,
  Spinner,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type TrendPoint = { count: number; day: string };

type OverviewData = {
  users7?: { result?: TrendPoint[] };
  users30?: { result?: TrendPoint[] };
  sessions30?: { result?: TrendPoint[] };
  events7?: { result?: TrendPoint[] };
};

type Metric = {
  label: string;
  value: string;
  change?: number; // percentage vs previous period
  icon: typeof Users;
  sparkline?: number[];
  color: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sumResult(result?: TrendPoint[]): number {
  if (!result) return 0;
  return result.reduce((acc, p) => acc + (p.count ?? 0), 0);
}

function calcChange(current: number, prev: number): number | undefined {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
}

function sparklineData(result?: TrendPoint[]): number[] {
  if (!result || result.length === 0) return [];
  return result.map((p) => p.count ?? 0);
}

// ─── Mini sparkline (SVG) ────────────────────────────────────────────────────

function Sparkline({ data, color = "#111" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const h = 28;
  const w = 80;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (v / max) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="shrink-0 opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50">
          <Icon className={cn("h-[18px] w-[18px]", metric.color)} />
        </div>
        {metric.sparkline && metric.sparkline.length > 0 && (
          <Sparkline data={metric.sparkline} color="#111" />
        )}
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{metric.label}</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <p className="text-2xl font-semibold tracking-tight text-gray-900">{metric.value}</p>
          {metric.change !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                metric.change >= 0
                  ? "bg-green-50 text-green-600"
                  : "bg-red-50 text-red-500",
              )}
            >
              {metric.change >= 0 ? (
                <TrendUp className="h-2.5 w-2.5" />
              ) : (
                <TrendDown className="h-2.5 w-2.5" />
              )}
              {Math.abs(metric.change)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Widget ─────────────────────────────────────────────────────────────

export function PostHogDashboardWidget() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/posthog?view=overview");
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
        setLastRefresh(new Date());
      } else {
        setError(json.error || "Failed to fetch analytics");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Build metrics from data
  const metrics: Metric[] = [];

  if (data) {
    // Active users (7d)
    const users7Sum = sumResult(data.users7?.result);
    const users30Sum = sumResult(data.users30?.result);
    const usersPrev7 = users30Sum - users7Sum; // rough proxy
    metrics.push({
      label: "Active Users (7d)",
      value: users7Sum.toLocaleString(),
      change: calcChange(users7Sum, usersPrev7),
      icon: Users,
      sparkline: sparklineData(data.users7?.result),
      color: "text-gray-700",
    });

    // Sessions (30d)
    const sessionsSum = sumResult(data.sessions30?.result);
    metrics.push({
      label: "Sessions (30d)",
      value: sessionsSum.toLocaleString(),
      icon: Eye,
      sparkline: sparklineData(data.sessions30?.result),
      color: "text-gray-600",
    });

    // Events (7d)
    const events7Sum = sumResult(data.events7?.result);
    metrics.push({
      label: "Page Views (7d)",
      value: events7Sum.toLocaleString(),
      icon: Lightning,
      sparkline: sparklineData(data.events7?.result),
      color: "text-gray-500",
    });

    // Avg session duration (derived from sessions/users)
    const avgSessionsPerUser = users7Sum > 0 ? (sessionsSum / 30 / users7Sum).toFixed(1) : "0";
    metrics.push({
      label: "Avg Sessions / User",
      value: avgSessionsPerUser,
      icon: Clock,
      color: "text-gray-400",
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900">
            <Lightning className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-900">Product Analytics</h3>
            <p className="text-[11px] text-gray-400">Powered by PostHog</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] text-gray-300">
              Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          >
            <ArrowsClockwise className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {loading && !data ? (
          // Loading skeleton
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="h-9 w-9 rounded-xl bg-gray-200" />
                <div className="mt-3 h-3 w-20 rounded bg-gray-200" />
                <div className="mt-1.5 h-7 w-16 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="flex flex-col items-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <Lightning className="h-5 w-5 text-gray-400" />
            </div>
            <p className="mt-3 text-[13px] font-medium text-gray-700">Analytics unavailable</p>
            <p className="mt-1 max-w-xs text-[12px] text-gray-400">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="mt-4 rounded-lg bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-gray-700"
            >
              Retry
            </button>
          </div>
        ) : (
          // Metrics grid
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {metrics.map((m) => (
              <MetricCard key={m.label} metric={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
