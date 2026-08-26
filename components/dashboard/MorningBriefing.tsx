"use client";

import { useEffect, useState } from "react";
import {
  Lightning,
  Spinner,
  ArrowClockwise,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type BriefingState = {
  status: "idle" | "loading" | "done" | "error";
  text: string;
};

export function MorningBriefing({
  userId,
  roleTitle,
  userName,
}: {
  userId: string;
  roleTitle: string | null | undefined;
  userName: string;
}) {
  const [state, setState] = useState<BriefingState>({ status: "idle", text: "" });
  const [expanded, setExpanded] = useState(true);
  const [cached, setCached] = useState(false);

  // Generate briefing on mount (with session cache)
  useEffect(() => {
    if (!userId || !roleTitle) return;

    // Check session cache first
    try {
      const cached = sessionStorage.getItem(`briefing-${userId}`);
      if (cached) {
        const parsed = JSON.parse(cached) as { text: string; ts: number };
        // Cache for 30 minutes
        if (Date.now() - parsed.ts < 30 * 60 * 1000) {
          setState({ status: "done", text: parsed.text });
          setCached(true);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, roleTitle]);

  async function generate() {
    setState({ status: "loading", text: "" });
    try {
      const res = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleTitle, userName }),
      });
      const data = await res.json();
      if (data.ok && data.briefing) {
        setState({ status: "done", text: data.briefing });
        // Cache in session
        try {
          sessionStorage.setItem(
            `briefing-${userId}`,
            JSON.stringify({ text: data.briefing, ts: Date.now() }),
          );
        } catch {
          /* ignore */
        }
      } else {
        setState({ status: "error", text: data.error ?? "Could not generate briefing" });
      }
    } catch {
      setState({ status: "error", text: "Network error — try again" });
    }
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white">
            <Lightning className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-gray-900">
              {greeting}, {userName.split(" ")[0]}
            </h2>
            <p className="text-[11.5px] text-gray-400">
              Your {roleTitle ?? ""} briefing for today
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Refresh */}
          <button
            onClick={generate}
            disabled={state.status === "loading"}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            title="Refresh briefing"
          >
            <ArrowClockwise
              className={cn(
                "h-3.5 w-3.5",
                state.status === "loading" && "animate-spin",
              )}
            />
          </button>

          {/* Collapse */}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            {expanded ? (
              <CaretUp className="h-3.5 w-3.5" />
            ) : (
              <CaretDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="mt-4">
          {state.status === "loading" && (
            <div className="flex items-center gap-3 py-4">
              <Spinner className="h-4 w-4 animate-spin text-gray-400" />
              <div className="space-y-2">
                <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-64 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-40 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          )}

          {state.status === "done" && (
            <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-700">
              {state.text}
            </div>
          )}

          {state.status === "error" && (
            <div className="py-3 text-center">
              <p className="text-[13px] text-gray-500">{state.text}</p>
              <button
                onClick={generate}
                className="mt-2 text-[12px] font-medium text-gray-400 hover:text-gray-700"
              >
                Try again
              </button>
            </div>
          )}

          {state.status === "done" && cached && (
            <p className="mt-3 text-[10px] text-gray-300">
              Cached · refreshes every 30 min
            </p>
          )}
        </div>
      )}
    </div>
  );
}
