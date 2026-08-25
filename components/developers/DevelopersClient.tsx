"use client";

import { useMemo, useState } from "react";
import {
  Key,
  Plus,
  Copy,
  Trash,
  ArrowSquareOut,
  GithubLogo,
  SlackLogo,
  WebhooksLogo,
  Pulse,
} from "@phosphor-icons/react";
import { createApiKey, revokeApiKey } from "@/app/actions/api-key-actions";
import { DateRangePicker, type DateRange } from "@/components/ui/DateRangePicker";
import { useUrlParam } from "@/lib/useUrlParam";

export type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string | null;
};

export type MetricRow = {
  provider: string;
  tokens: number;
  cost: number;
  latency: number;
  status: string;
  recorded_at: string;
};

export function DevelopersClient({
  keys: initialKeys,
  metrics,
}: {
  keys: ApiKeyRow[];
  metrics: MetricRow[];
}) {
  const [keys, setKeys] = useState<ApiKeyRow[]>(initialKeys);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshKey, setFreshKey] = useState<string | null>(null);

  // Persisted in the URL (?range=24h|14d|custom&from=…&to=…) for shareable views.
  const [rangeParam, setRangeParam] = useUrlParam("range");
  const [fromParam, setFromParam] = useUrlParam("from");
  const [toParam, setToParam] = useUrlParam("to");
  const [range, setRangeState] = useState<"24h" | "14d" | "custom">(
    rangeParam === "14d" || rangeParam === "custom" ? rangeParam : "24h",
  );
  const [customRange, setCustomRangeState] = useState<DateRange>({
    start: fromParam,
    end: toParam,
  });
  function setRange(r: "24h" | "14d" | "custom") {
    setRangeState(r);
    setRangeParam(r);
    if (r !== "custom") {
      setFromParam(null);
      setToParam(null);
    }
  }
  function setCustomRange(r: DateRange) {
    setCustomRangeState(r);
    setFromParam(r.start);
    setToParam(r.end);
  }

  async function onCreate() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await createApiKey({ name: name.trim(), scopes: ["read", "write"] });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setFreshKey(res.key ?? null);
    setName("");
    // Optimistic refresh: reload via router.refresh() keeps the server list in sync.
    window.location.reload();
  }

  async function onRevoke(id: string) {
    if (busy) return;
    setBusy(true);
    const res = await revokeApiKey(id);
    setBusy(false);
    if (res.ok) {
      setKeys((ks) => ks.map((k) => (k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k)));
    } else {
      setError(res.error);
    }
  }

  const active = keys.filter((k) => !k.revoked_at);
  const revoked = keys.filter((k) => !!k.revoked_at);

  // Aggregations for the API usage section (mirrors the dashboard widget).
  const usage = useMemo(() => {
    let rows = metrics;
    if (range === "24h") {
      rows = metrics.filter((m) => new Date(m.recorded_at).getTime() >= Date.now() - 24 * 3600 * 1000);
    } else if (range === "14d") {
      rows = metrics.filter((m) => new Date(m.recorded_at).getTime() >= Date.now() - 14 * 24 * 3600 * 1000);
    } else if (customRange.start && customRange.end) {
      const start = new Date(customRange.start + "T00:00:00").getTime();
      const end = new Date(customRange.end + "T23:59:59").getTime();
      rows = metrics.filter((m) => {
        const t = new Date(m.recorded_at).getTime();
        return t >= start && t <= end;
      });
    }
    const totalTokens = rows.reduce((a, b) => a + b.tokens, 0);
    const totalCost = rows.reduce((a, b) => a + b.cost, 0);
    const avgLatency = rows.length
      ? Math.round(rows.reduce((a, b) => a + b.latency, 0) / rows.length)
      : 0;
    const errs = rows.filter((r) => r.status !== "ok" && r.status !== "success").length;

    const byProvider = new Map<string, number>();
    for (const row of rows) byProvider.set(row.provider, (byProvider.get(row.provider) ?? 0) + row.cost);
    const providers = Array.from(byProvider.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxCost = Math.max(...providers.map((p) => p[1]), 0.0001);

    // Daily cost trend for the last 14 days (always computed; shown in the 14d chart).
    const days: { label: string; cost: number; tokens: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 24 * 3600 * 1000;
      const dayRows = metrics.filter((m) => {
        const t = new Date(m.recorded_at).getTime();
        return t >= dayStart && t < dayEnd;
      });
      days.push({
        label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
        cost: dayRows.reduce((a, b) => a + b.cost, 0),
        tokens: dayRows.reduce((a, b) => a + b.tokens, 0),
      });
    }
    const maxDayCost = Math.max(...days.map((d) => d.cost), 0.0001);

    return { totalTokens, totalCost, avgLatency, errs, providers, maxCost, days, maxDayCost };
  }, [metrics, range, customRange]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Developers</h1>
        <p className="mt-1 text-sm text-gray-500">
          Build on Celeste with scoped API keys and integrations.
        </p>
      </div>

      {/* API keys */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
              <Key className="h-4 w-4 text-gray-400" />
              API keys
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-500">
              Keys are scoped and hashed at rest. The raw key is shown only once.
            </p>
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onCreate();
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Key name (e.g. CI bot)"
              className="h-9 w-52 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-gray-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              New key
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700">
            {error}
          </div>
        )}

        {freshKey && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-[13px] font-semibold text-gray-900">Your new API key — copy it now</p>
            <p className="mt-1 text-[13px] text-gray-600">
              It will not be shown again. Store it somewhere safe.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-[12.5px] font-mono text-gray-900 ring-1 ring-gray-200">
                {freshKey}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(freshKey)}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-gray-900 px-3 text-[13px] font-medium text-white hover:bg-gray-700"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {active.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] text-gray-500">No API keys yet — create one to get started.</p>
            </div>
          ) : (
            active.map((k) => (
              <div
                key={k.id}
                className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-gray-900">{k.name}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[12px] text-gray-500">
                    <code className="font-mono text-gray-400">{k.prefix}</code>
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                      {k.scopes.join(", ")}
                    </span>
                    {k.last_used_at && <span>Used {new Date(k.last_used_at).toLocaleDateString()}</span>}
                  </p>
                </div>
                <button
                  onClick={() => onRevoke(k.id)}
                  disabled={busy}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-[12.5px] font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
                >
                  <Trash className="h-3.5 w-3.5" />
                  Revoke
                </button>
              </div>
            ))
          )}
          {revoked.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Revoked
              </p>
              {revoked.map((k) => (
                <div key={k.id} className="flex items-center gap-3 py-2 opacity-50">
                  <p className="flex-1 truncate text-[13px] text-gray-500 line-through">{k.name}</p>
                  <code className="font-mono text-[12px] text-gray-400">{k.prefix}</code>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* API usage */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
              <Pulse className="h-4 w-4 text-gray-400" />
              API usage
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-500">
              Aggregate tokens, cost and latency across every provider.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
              {(["24h", "14d", "custom"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    range === r ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {r === "24h" ? "24h" : r === "14d" ? "14 days" : "Custom"}
                </button>
              ))}
            </div>
            {range === "custom" && (
              <DateRangePicker
                value={customRange}
                onChange={setCustomRange}
                placeholder="Pick range…"
                className="w-44"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <UsageStat label="Tokens" value={usage.totalTokens.toLocaleString()} />
          <UsageStat label="Cost" value={`$${usage.totalCost.toFixed(4)}`} />
          <UsageStat label="Avg latency" value={`${usage.avgLatency}ms`} />
          <UsageStat label="Errors" value={String(usage.errs)} tone={usage.errs > 0 ? "text-gray-900" : undefined} />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {/* Provider cost bars */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">
              Cost by provider
            </p>
            {usage.providers.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-gray-400">No usage in this period.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {usage.providers.map(([provider, cost]) => (
                  <div key={provider} className="flex items-center gap-2">
                    <span className="w-24 truncate text-[12px] capitalize text-gray-600">{provider}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gray-800"
                        style={{ width: `${Math.max((cost / usage.maxCost) * 100, 2)}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-[12px] tabular-nums text-gray-500">
                      ${cost.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 14-day cost trend */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">
              Daily cost — last 14 days
            </p>
            <div className="mt-4 flex h-28 items-end gap-1">
              {usage.days.map((d, i) => (
                <div
                  key={i}
                  className="group relative flex-1 rounded-t bg-gray-200 transition-colors hover:bg-gray-300"
                  style={{ height: `${Math.max((d.cost / usage.maxDayCost) * 100, 3)}%` }}
                  title={`${d.label}: $${d.cost.toFixed(4)} (${d.tokens.toLocaleString()} tokens)`}
                >
                  <span className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    ${d.cost.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-1">
              {usage.days.map((d, i) => (
                <span
                  key={i}
                  className="flex-1 truncate text-center text-[9px] text-gray-400"
                  title={d.label}
                >
                  {i % 3 === 0 ? d.label : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section>
        <h2 className="mb-4 text-[15px] font-semibold text-gray-900">Integrations</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: GithubLogo,
              name: "GitHub",
              desc: "Post deploy events and PR summaries to Celeste HQ.",
              tag: "Coming soon",
            },
            {
              icon: SlackLogo,
              name: "Slack",
              desc: "Get standup reminders and approval notifications in your channel.",
              tag: "Coming soon",
            },
            {
              icon: WebhooksLogo,
              name: "Webhooks",
              desc: "Forward Celeste events to your own endpoints.",
              tag: "Coming soon",
            },
          ].map((it) => {
            const Icon = it.icon;
            return (
              <div
                key={it.name}
                className="group rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 ring-1 ring-gray-200">
                    <Icon className="h-4 w-4 text-gray-500" />
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10.5px] font-medium text-gray-500">
                    {it.tag}
                  </span>
                </div>
                <p className="mt-3 text-[14px] font-semibold text-gray-900">{it.name}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-gray-500">{it.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Reference */}
      <section className="mt-8">
        <h2 className="mb-4 text-[15px] font-semibold text-gray-900">Documentation</h2>
        <a
          href="https://supabase.com/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13.5px] font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900"
        >
          <ArrowSquareOut className="h-4 w-4 text-gray-400" />
          Celeste API reference (Supabase REST)
          <span className="ml-auto text-[12px] text-gray-400">supabase.com/docs ↗</span>
        </a>
      </section>
    </div>
  );
}

function UsageStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums text-gray-900 ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
