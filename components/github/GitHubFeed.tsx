"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GitCommit,
  GitPullRequest,
  Flag,
  Rocket,
  Tag,
  Star,
  Spinner,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────
export type GitHubEvent = {
  id: string;
  event_type: string;
  repository: string;
  sender: string | null;
  sender_avatar: string | null;
  title: string | null;
  body: string | null;
  branch: string | null;
  pr_number: number | null;
  pr_url: string | null;
  ai_summary: string | null;
  created_at: string;
};

// ── Event type config ───────────────────────────────────────────────────────
const EVENT_CONFIG: Record<
  string,
  { icon: typeof GitCommit; label: string; color: string }
> = {
  push: { icon: GitCommit, label: "Push", color: "#111217" },
  "pull_request.opened": { icon: GitPullRequest, label: "PR Opened", color: "#111217" },
  "pull_request.closed": { icon: GitPullRequest, label: "PR Closed", color: "#111217" },
  "pull_request.merged": { icon: GitPullRequest, label: "PR Merged", color: "#111217" },
  "pull_request.synchronize": { icon: GitPullRequest, label: "PR Updated", color: "#111217" },
  pull_request: { icon: GitPullRequest, label: "Pull Request", color: "#111217" },
  pull_request_review: { icon: Star, label: "Review", color: "#111217" },
  "issues.opened": { icon: Flag, label: "Issue Opened", color: "#111217" },
  "issues.closed": { icon: Flag, label: "Issue Closed", color: "#111217" },
  issues: { icon: Flag, label: "Issue", color: "#111217" },
  release: { icon: Tag, label: "Release", color: "#111217" },
  deployment_status: { icon: Rocket, label: "Deploy", color: "#111217" },
};

function getEventConfig(eventType: string) {
  return EVENT_CONFIG[eventType] ?? EVENT_CONFIG.push;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Main component ──────────────────────────────────────────────────────────
export function GitHubFeed({
  initialEvents = [],
  repoFilter,
}: {
  initialEvents?: GitHubEvent[];
  repoFilter?: string;
}) {
  const [events, setEvents] = useState<GitHubEvent[]>(initialEvents);
  const [live, setLive] = useState(false);

  // Realtime subscription
  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel("github-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "github_events" },
        (payload) => {
          const row = payload.new as GitHubEvent;
          setEvents((prev) => [row, ...prev].slice(0, 100));
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const filtered = useMemo(() => {
    if (!repoFilter) return events;
    return events.filter((e) => e.repository === repoFilter);
  }, [events, repoFilter]);

  const repos = useMemo(() => {
    const set = new Set(events.map((e) => e.repository));
    return Array.from(set).sort();
  }, [events]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            GitHub Activity
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Real-time feed from your repositories with AI-powered summaries.
          </p>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
            live
              ? "border-gray-300 bg-gray-100 text-gray-700"
              : "border-gray-200 bg-gray-50 text-gray-500",
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

      {/* Repo filter chips */}
      {repos.length > 1 && (
        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => {}}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
              !repoFilter
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
            )}
          >
            All repos
          </button>
          {repos.map((r) => (
            <button
              key={r}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                repoFilter === r
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
          <GitCommit className="h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">
            No GitHub events yet
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Configure your webhook to point at{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px]">
              /api/webhooks/github
            </code>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single event card ───────────────────────────────────────────────────────
function EventCard({ event }: { event: GitHubEvent }) {
  const config = getEventConfig(event.event_type);
  const Icon = config.icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-gray-200 hover:shadow-sm">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <SquircleAvatar
          name={event.sender ?? "?"}
          src={event.sender_avatar}
          size="xs"
          className="h-8 w-8 shrink-0 text-[10px]"
        />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="font-medium text-gray-900">
              {event.sender ?? "unknown"}
            </span>
            <Icon className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-500">{config.label}</span>
            <span className="text-gray-400">·</span>
            <span className="truncate text-gray-400">{event.repository}</span>
            {event.branch && (
              <>
                <span className="text-gray-400">·</span>
                <span className="font-mono text-[11px] text-gray-400">
                  {event.branch}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          {event.title && (
            <p className="mt-1 truncate text-[13px] font-medium text-gray-800">
              {event.title}
            </p>
          )}

          {/* AI Summary */}
          {event.ai_summary && (
            <div className="mt-2.5 rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5">
              <div className="mb-1 flex items-center gap-1.5">
                <svg
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 text-gray-400"
                  width="14"
                  height="14"
                  viewBox="0 0 18 18"
                  style={{ strokeWidth: 1.5 }}
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.563 2.813h-5.25a2.25 2.25 0 0 0-2.25 2.25v6.375a2.25 2.25 0 0 0 2.25 2.25h2.176a.75.75 0 0 1 .482.175l1.548 1.298a.75.75 0 0 0 .96.003l1.575-1.304a.75.75 0 0 1 .478-.172h2.156a2.25 2.25 0 0 0 2.25-2.25v-2.25"
                  />
                  <path
                    fill="currentColor"
                    d="m15.18 3.139-.522-1.359a.437.437 0 0 0-.816 0l-.522 1.359a.75.75 0 0 1-.431.43l-1.359.523a.437.437 0 0 0 0 .816l1.359.522a.75.75 0 0 1 .43.431l.523 1.359a.437.437 0 0 0 .816 0l.522-1.359a.75.75 0 0 1 .431-.43l1.359-.523a.437.437 0 0 0 0-.816l-1.359-.522a.75.75 0 0 1-.43-.431"
                  />
                </svg>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  AI Summary
                </span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-gray-600">
                {event.ai_summary}
              </p>
            </div>
          )}

          {/* Commit messages (for push events) */}
          {event.event_type === "push" && event.body && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-2 text-[11.5px] text-gray-400 hover:text-gray-600"
            >
              Show commit messages…
            </button>
          )}
          {event.event_type === "push" && event.body && expanded && (
            <div className="mt-2 space-y-1">
              {event.body.split("\n").slice(0, 5).map((line, i) => (
                <p
                  key={i}
                  className="font-mono text-[11px] text-gray-500"
                >
                  {line}
                </p>
              ))}
              {event.body.split("\n").length > 5 && (
                <button
                  onClick={() => setExpanded(false)}
                  className="text-[11px] text-gray-400 hover:text-gray-600"
                >
                  Show less…
                </button>
              )}
            </div>
          )}
        </div>

        {/* Timestamp + link */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-[11px] tabular-nums text-gray-400">
            {relativeTime(event.created_at)}
          </span>
          {event.pr_url && (
            <a
              href={event.pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md p-1 text-gray-300 transition-colors hover:text-gray-600"
              title="Open on GitHub"
            >
              <ArrowSquareOut className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
