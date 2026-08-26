"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
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
    if (!userId) return;

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
        body: JSON.stringify({ userId, roleTitle: roleTitle ?? "Team Member", userName }),
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
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">
            {greeting}, {userName.split(" ")[0]}
          </h2>
          {state.status === "done" && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="rounded p-0.5 text-gray-400 transition-colors hover:text-gray-700"
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Refresh */}
          <button
            onClick={generate}
            disabled={state.status === "loading"}
            className="rounded p-1 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-50"
            title="Refresh briefing"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                state.status === "loading" && "animate-spin",
              )}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="mt-2">
          {state.status === "loading" && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
              <span className="text-[12.5px] text-gray-500">Generating your briefing…</span>
            </div>
          )}

          {state.status === "done" && (
            <div
              className="text-[13px] leading-relaxed text-gray-600"
              dangerouslySetInnerHTML={{ __html: state.text }}
            />
          )}

          {state.status === "error" && (
            <div className="py-2">
              <p className="text-[12.5px] text-gray-500">{state.text}</p>
              <button
                onClick={generate}
                className="mt-1 text-[11px] font-medium text-gray-400 hover:text-gray-700"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
