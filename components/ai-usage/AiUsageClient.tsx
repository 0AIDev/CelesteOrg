"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pulse,
  Coin,
  Eye,
  EyeSlash,
  Key,
  Plus,
  Timer,
  Trash,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge, statusTone } from "@/components/ui/Badge";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { CustomSelect, type SelectOption } from "@/components/ui/CustomSelect";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { deleteAiCredential, saveAiCredential } from "@/app/actions/ai-usage-actions";

// ─── Types ─────────────────────────────────────────────────────────────────
type MetricRow = {
  id: string;
  provider: string;
  model: string | null;
  tokens: number;
  cost: number;
  latency: number;
  status: string;
  recorded_at: string;
  user: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

type CredentialRow = {
  id: string;
  provider: string;
  name: string;
  created_by: string | null;
  created_at: string | null;
};

type Member = { id: string; full_name: string | null; avatar_url: string | null };

const PROVIDERS: SelectOption[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google Gemini" },
  { value: "groq", label: "Groq" },
  { value: "mistral", label: "Mistral" },
  { value: "together", label: "Together AI" },
  { value: "perplexity", label: "Perplexity" },
  { value: "other", label: "Other" },
];

// Real brand SVGs for each provider (openai = mark, anthropic = asterisk,
// google = G, groq = bolt, mistral = M, together = T, perplexity = swirl).
const PROVIDER_LOGO: Record<string, (props: { className?: string }) => React.ReactNode> = {
  openai: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="OpenAI">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
    </svg>
  ),
  anthropic: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" className={className} aria-label="Anthropic">
      <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z"/>
    </svg>
  ),
  google: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Google">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  groq: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" className={className} aria-label="Groq">
      <path d="M12.036 2c-3.853-.035-7 3-7.036 6.781-.035 3.782 3.055 6.872 6.908 6.907h2.42v-2.566h-2.292c-2.407.028-4.38-1.866-4.408-4.23-.029-2.362 1.901-4.298 4.308-4.326h.1c2.407 0 4.358 1.915 4.365 4.278v6.305c0 2.342-1.944 4.25-4.323 4.279a4.375 4.375 0 01-3.033-1.252l-1.851 1.818A7 7 0 0012.029 22h.092c3.803-.056 6.858-3.083 6.879-6.816v-6.5C18.907 4.963 15.817 2 12.036 2z"/>
    </svg>
  ),
  mistral: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Mistral">
      <path d="M3 3h4.5v4.5H3V3zm6.75 0h4.5v4.5h-4.5V3zM16.5 3H21v4.5h-4.5V3zM3 9.75h4.5v4.5H3v-4.5zm6.75 0h4.5v4.5h-4.5v-4.5zM16.5 9.75H21v4.5h-4.5v-4.5zM3 16.5h4.5V21H3v-4.5zm6.75 0h4.5V21h-4.5v-4.5zM16.5 16.5H21V21h-4.5v-4.5z"/>
    </svg>
  ),
  together: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Together AI">
      <path d="M12 2 21 7v10l-9 5-9-5V7l9-5Zm0 2.5L5.5 8.4v7.2L12 19.5l6.5-3.9V8.4L12 4.5Z"/>
    </svg>
  ),
  perplexity: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-label="Perplexity">
      <path d="M12 3v18M12 3l-4 7h8l-4-7Zm0 18-4-7h8l-4 7Z" strokeLinejoin="round"/>
    </svg>
  ),
  other: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Other">
      <circle cx="12" cy="12" r="8"/>
    </svg>
  ),
};

function ProviderLogo({ provider, className = "h-4 w-4 shrink-0" }: { provider: string; className?: string }) {
  const render = PROVIDER_LOGO[provider] ?? PROVIDER_LOGO.other;
  return <span className="inline-flex shrink-0">{render({ className })}</span>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtCost(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Monochrome bars — every provider renders the same black.
const PROVIDER_BAR_COLOR: Record<string, string> = {
  openai: "#111217",
  anthropic: "#111217",
  google: "#111217",
  groq: "#111217",
  mistral: "#111217",
  together: "#111217",
  perplexity: "#111217",
  other: "#111217",
  internal: "#111217",
};

function providerBarColor(p: string): string {
  return PROVIDER_BAR_COLOR[p] ?? "#111217";
}

// ─── Main component ─────────────────────────────────────────────────────────
export function AiUsageClient({
  currentUserId,
  isAdminOrFounder,
  metrics: initialMetrics,
  credentials: initialCredentials,
  members,
}: {
  currentUserId: string | null;
  isAdminOrFounder: boolean;
  metrics: MetricRow[];
  credentials: CredentialRow[];
  members: Member[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<MetricRow[]>(initialMetrics);
  const [credentials, setCredentials] = useState<CredentialRow[]>(initialCredentials);
  const [live, setLive] = useState(false);

  // Member lookup for realtime rows (server rows already carry the joined user).
  const memberById = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  // Realtime: stream new api_metrics rows in as they are recorded.
  useEffect(() => {
    const sb = createClient();
    const channel = sb.channel("celeste-ai-usage");
    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "api_metrics" },
        (payload) => {
          const n = payload.new as Record<string, unknown>;
          const uid = (n.user_id as string) ?? null;
          const member = uid ? memberById.get(uid) : null;
          const row: MetricRow = {
            id: (n.id as string) ?? crypto.randomUUID(),
            provider: (n.provider as string) ?? "other",
            model: (n.model as string | null) ?? null,
            tokens: Number(n.tokens_used ?? 0),
            cost: Number(n.cost ?? 0),
            latency: Number(n.latency_ms ?? 0),
            status: (n.status as string) ?? "ok",
            recorded_at: (n.recorded_at as string) ?? new Date().toISOString(),
            user: member ? { id: member.id, full_name: member.full_name, avatar_url: member.avatar_url } : null,
          };
          setRows((prev) => [row, ...prev].slice(0, 300));
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Aggregates (24h window) ───────────────────────────────────────────────
  const agg = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600 * 1000;
    const recent = rows.filter((r) => new Date(r.recorded_at).getTime() >= cutoff);
    const today = rows.filter((r) => new Date(r.recorded_at).getTime() >= startOfToday());

    const totalTokens = recent.reduce((a, b) => a + b.tokens, 0);
    const totalCost = recent.reduce((a, b) => a + b.cost, 0);
    const requests = recent.length;
    const avgLatency = requests ? Math.round(recent.reduce((a, b) => a + b.latency, 0) / requests) : 0;
    const errors = recent.filter((r) => r.status !== "ok").length;

    // Hourly token buckets (last 24h).
    const hours: { label: string; tokens: number; cost: number }[] = [];
    const now = Date.now();
    for (let i = 23; i >= 0; i--) {
      const start = now - i * 3600 * 1000;
      const end = start + 3600 * 1000;
      const bucket = rows.filter((r) => {
        const t = new Date(r.recorded_at).getTime();
        return t >= start && t < end;
      });
      const d = new Date(start);
      hours.push({
        label: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        tokens: bucket.reduce((a, b) => a + b.tokens, 0),
        cost: bucket.reduce((a, b) => a + b.cost, 0),
      });
    }
    const maxHourTokens = Math.max(...hours.map((h) => h.tokens), 1);

    // Cost by provider (24h).
    const byProvider = new Map<string, number>();
    for (const r of recent) byProvider.set(r.provider, (byProvider.get(r.provider) ?? 0) + r.cost);
    const providers = Array.from(byProvider.entries()).sort((a, b) => b[1] - a[1]);
    const maxProviderCost = Math.max(...providers.map((p) => p[1]), 0.0001);

    // Per-member (today, live).
    const perUser = members.map((m) => {
      const mine = today.filter((r) => r.user?.id === m.id);
      const lastActive = mine.reduce<string | null>((acc, r) => {
        if (!acc || r.recorded_at > acc) return r.recorded_at;
        return acc;
      }, null);
      return {
        id: m.id,
        name: m.full_name,
        avatar_url: m.avatar_url,
        tokens: mine.reduce((a, b) => a + b.tokens, 0),
        cost: mine.reduce((a, b) => a + b.cost, 0),
        requests: mine.length,
        lastActive,
      };
    });
    const unattributed = today.filter((r) => !r.user);
    if (unattributed.length > 0) {
      perUser.push({
        id: "unattributed",
        name: "Unattributed / system",
        avatar_url: null,
        tokens: unattributed.reduce((a, b) => a + b.tokens, 0),
        cost: unattributed.reduce((a, b) => a + b.cost, 0),
        requests: unattributed.length,
        lastActive: unattributed[unattributed.length - 1]?.recorded_at ?? null,
      });
    }
    perUser.sort((a, b) => b.tokens - a.tokens);

    return { totalTokens, totalCost, requests, avgLatency, errors, hours, maxHourTokens, providers, maxProviderCost, perUser };
  }, [rows, members]);

  // ── Credentials form state ────────────────────────────────────────────────
  const [provider, setProvider] = useState("");
  const [credName, setCredName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSaveCredential(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !provider || !credName.trim() || apiKey.trim().length < 8) return;
    setBusy(true);
    setError(null);
    const res = await saveAiCredential({ provider, name: credName.trim(), api_key: apiKey.trim() });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setProvider("");
    setCredName("");
    setApiKey("");
    router.refresh();
  }

  async function onDeleteCredential(id: string) {
    if (busy) return;
    setBusy(true);
    const res = await deleteAiCredential(id);
    setBusy(false);
    if (res.ok) {
      setCredentials((cs) => cs.filter((c) => c.id !== id));
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-5">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">
            Realtime AI Usage
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Live token consumption across every provider and team member.
          </p>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
            live ? "border-gray-300 bg-gray-100 text-gray-700" : "border-gray-200 bg-gray-50 text-gray-500",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", live ? "animate-pulse bg-gray-900" : "bg-gray-400")} />
          {live ? "Live" : "Connecting…"}
        </span>
      </div>

      {/* Big stats — one flat card, 4 cells divided by hairlines */}
      <FullscreenCard padding={false} className="overflow-hidden">
        <div className="grid grid-cols-2 divide-gray-100 sm:grid-cols-4 sm:divide-x">
          <BigStat icon={<Pulse className="h-4 w-4" />} label="Tokens · 24h" value={fmtTokens(agg.totalTokens)} />
          <BigStat icon={<Coin className="h-4 w-4" />} label="Cost · 24h" value={fmtCost(agg.totalCost)} />
          <BigStat icon={<Pulse className="h-4 w-4" />} label="Requests · 24h" value={agg.requests.toLocaleString()} />
          <BigStat
            icon={<Timer className="h-4 w-4" />}
            label="Avg latency · 24h"
            value={`${agg.avgLatency}ms`}
            sub={agg.errors > 0 ? `${agg.errors} errors` : "0 errors"}
            subTone={agg.errors > 0 ? "text-gray-600" : "text-gray-400"}
          />
        </div>
      </FullscreenCard>

      {/* Charts row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Hourly tokens */}
        <FullscreenCard padding={false} className="overflow-hidden lg:col-span-2">
          <CardHeader
            title="Tokens per hour — last 24h"
            right={<span className="flex items-center gap-2 text-[11px] tabular-nums text-gray-400">{fmtTokens(agg.totalTokens)} total</span>}
          />
          <div className="flex h-36 items-end gap-1 px-4 pb-2 pt-4">
            {agg.hours.map((h, i) => (
              <div key={i} className="group relative flex-1">
                <div
                  className="w-full rounded-t bg-gray-800 transition-all hover:bg-gray-600"
                  style={{ height: `${Math.max((h.tokens / agg.maxHourTokens) * 100, h.tokens > 0 ? 4 : 1.5)}%` }}
                  title={`${h.label} — ${h.tokens.toLocaleString()} tokens (${fmtCost(h.cost)})`}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1 px-4 pb-3">
            {agg.hours.map((h, i) => (
              <span key={i} className="flex-1 truncate text-center text-[9px] tabular-nums text-gray-400">
                {i % 3 === 0 ? h.label : ""}
              </span>
            ))}
          </div>
        </FullscreenCard>

        {/* Cost by provider */}
        <FullscreenCard padding={false} className="overflow-hidden">
          <CardHeader
            title="Cost by provider"
            right={<span className="flex items-center gap-2 text-[11px] tabular-nums text-gray-400">{fmtCost(agg.totalCost)}</span>}
          />
          <div className="space-y-2.5 p-4">
            {agg.providers.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-gray-400">No usage in the last 24h.</p>
            ) : (
              agg.providers.map(([p, cost]) => (
                <div key={p} className="flex items-center gap-2">
                  <ProviderLogo provider={p} className="h-4 w-4 shrink-0" />
                  <span className="w-20 truncate text-[12px] capitalize text-gray-600">{p}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max((cost / agg.maxProviderCost) * 100, 2)}%`,
                        backgroundColor: providerBarColor(p),
                      }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-[12px] tabular-nums text-gray-500">{fmtCost(cost)}</span>
                </div>
              ))
            )}
          </div>
        </FullscreenCard>
      </div>

      {/* Tables row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Per-member live consumption */}
        <FullscreenCard padding={false} className="overflow-hidden">
          <CardHeader
            title="Team consumption · today"
            right={
              <span className="flex items-center gap-1 text-[11px] text-gray-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-900" /> live</span>
            }
          />
          <div className="max-h-[22rem] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agg.perUser.every((u) => u.tokens === 0 && u.requests === 0) ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-[13px] text-gray-400">
                      No calls recorded today — usage will stream in live as the team uses the APIs.
                    </TableCell>
                  </TableRow>
                ) : (
                  agg.perUser.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <SquircleAvatar name={u.name} src={u.avatar_url} size="xs" />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-gray-900">{u.name}</p>
                            {u.lastActive && (
                              <p className="text-[11px] text-gray-400">last call {fmtTime(u.lastActive)}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-gray-900">
                        {fmtTokens(u.tokens)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-600">{fmtCost(u.cost)}</TableCell>
                      <TableCell className="text-right tabular-nums text-gray-500">{u.requests}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </FullscreenCard>

        {/* Recent calls table */}
        <FullscreenCard padding={false} className="overflow-hidden">
          <CardHeader
            title="Recent calls"
            right={<span className="flex items-center gap-2 text-[11px] tabular-nums text-gray-400">{rows.length} rows</span>}
          />
          <div className="max-h-[22rem] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Latency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-[13px] text-gray-400">
                      No calls recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.slice(0, 50).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap tabular-nums text-gray-400">{fmtTime(r.recorded_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <ProviderLogo provider={r.provider} className="h-3.5 w-3.5" />
                          <span className="capitalize">{r.provider}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[12px] text-gray-500">{r.model ?? "—"}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtTokens(r.tokens)}</TableCell>
                      <TableCell className="text-right tabular-nums text-gray-600">{fmtCost(r.cost)}</TableCell>
                      <TableCell className="text-right tabular-nums text-gray-500">{r.latency}ms</TableCell>
                      <TableCell>
                        <Badge tone={statusTone(r.status)} className="capitalize">{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </FullscreenCard>
      </div>

      {/* Credentials manager */}
      <FullscreenCard padding={false} className="mt-4 overflow-hidden">
        <CardHeader
          title="AI provider keys"
          right={
            <span className="flex items-center gap-2 text-[11px] text-gray-400">
              Stored server-side · raw keys never reach the browser
            </span>
          }
        />
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          {/* Add form */}
          <form onSubmit={onSaveCredential} className="space-y-2.5 rounded-xl border border-gray-100 bg-gray-50/50 p-3.5">
            <p className="text-[13px] font-semibold text-gray-900">Add a provider key</p>
            <div className="grid grid-cols-2 gap-2.5">
              <CustomSelect
                value={provider}
                onValueChange={setProvider}
                options={PROVIDERS}
                placeholder="Provider…"
              />
              <input
                value={credName}
                onChange={(e) => setCredName(e.target.value)}
                placeholder="Label (e.g. Prod OpenAI)"
                className="input h-9 text-[13px]"
              />
            </div>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-…"
                className="input h-9 w-full pr-9 font-mono text-[13px]"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-[12px] text-gray-600">{error}</p>}
            <button
              type="submit"
              disabled={busy || !provider || !credName.trim() || apiKey.trim().length < 8}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-gray-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Save key
            </button>
          </form>

          {/* List */}
          <div className="space-y-2">
            {credentials.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 p-6 text-center">
                <Key className="h-5 w-5 text-gray-300" />
                <p className="mt-2 text-[13px] font-medium text-gray-600">No provider keys stored</p>
                <p className="mt-0.5 text-[12px] text-gray-400">
                  Add your OpenAI / Anthropic / Google keys here and watch consumption stream in live.
                </p>
              </div>
            ) : (
              credentials.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3.5 py-2.5"
                >
                  <ProviderLogo provider={c.provider} className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-gray-900">{c.name}</p>
                    <p className="flex items-center gap-2 text-[11.5px] text-gray-400">
                      <span className="capitalize">{c.provider}</span>
                      <span className="font-mono">••••••••••</span>
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteCredential(c.id)}
                    disabled={busy}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
            {isAdminOrFounder && credentials.length > 0 && (
              <p className="px-1 text-[11px] text-gray-400">
                You’re an admin — you can remove any credential. Members can only remove their own.
              </p>
            )}
          </div>
        </div>
      </FullscreenCard>
    </div>
  );
}

// ─── Small building blocks ──────────────────────────────────────────────────
function CardHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
      <h2 className="text-[13px] font-semibold text-gray-900">{title}</h2>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}

// Plain card wrapper (no fullscreen button).
function FullscreenCard({
  className,
  children,
  padding,
}: {
  className?: string;
  children: React.ReactNode;
  padding?: boolean;
}) {
  return (
    <Card padding={padding} className={className}>
      {children}
    </Card>
  );
}

function BigStat({
  icon,
  label,
  value,
  sub,
  subTone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  subTone?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-900">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-gray-500">{label}</p>
        <p className="truncate text-xl font-semibold tabular-nums text-gray-900">{value}</p>
        {sub && <p className={cn("truncate text-[11px] tabular-nums", subTone ?? "text-gray-400")}>{sub}</p>}
      </div>
    </div>
  );
}
