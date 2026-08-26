"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReasoningStep {
  title: string;
  body: string;
}

interface ReasoningPanelProps {
  active: boolean;
  className?: string;
}

// Fake reasoning steps that appear while waiting for AI response
const FAKE_STEPS: ReasoningStep[] = [
  { title: "Understanding your request", body: "Analyzing what you're asking for..." },
  { title: "Gathering context", body: "Checking your workspace data and history..." },
  { title: "Formulating response", body: "Preparing a helpful answer..." },
  { title: "Finalizing", body: "Reviewing the response for accuracy..." },
];

/**
 * Fake reasoning panel - shows thinking steps while AI processes
 * Maximum 5 seconds total, steps appear one by one
 */
export function ReasoningPanel({ active, className }: ReasoningPanelProps) {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [open, setOpen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!active) {
      // Reset when not active
      setVisibleSteps(0);
      setElapsed(0);
      setOpen(false);
      return;
    }

    // Start timer
    const startTime = Date.now();
    
    intervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      const elapsedSec = Math.min(5, Math.floor(elapsedMs / 1000));
      setElapsed(elapsedSec);
      
      // Show steps progressively: 0-1s = step 1, 1-2.5s = step 2, 2.5-4s = step 3, 4-5s = step 4
      if (elapsedMs < 1000) {
        setVisibleSteps(1);
      } else if (elapsedMs < 2500) {
        setVisibleSteps(2);
      } else if (elapsedMs < 4000) {
        setVisibleSteps(3);
      } else {
        setVisibleSteps(4);
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  if (!active && visibleSteps === 0) return null;

  const shown = FAKE_STEPS.slice(0, visibleSteps);
  const isStreaming = active && elapsed < 5;

  return (
    <div className={cn("w-full", className)}>
      {/* Collapsible trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 py-1 text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
      >
        {isStreaming ? (
          <>
            <span className="size-1.5 animate-pulse rounded-full bg-blue-500" />
            <span className="font-medium">Thinking</span>
            <span className="font-mono text-gray-300 tabular-nums">{elapsed}s</span>
          </>
        ) : (
          <span className="font-medium">Thought for {elapsed}s</span>
        )}
        <ChevronDown 
          className={cn(
            "h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200",
            open && "rotate-180"
          )} 
        />
      </button>

      {/* Steps list */}
      {open && shown.length > 0 && (
        <ol className="flex flex-col gap-3 pt-2 pb-1 pl-1">
          {shown.map((step, i) => {
            const isActive = isStreaming && i === shown.length - 1;
            return (
              <li
                key={step.title}
                className="flex gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300"
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full transition-colors duration-300",
                    isActive ? "animate-pulse bg-blue-500" : "bg-gray-300"
                  )}
                />
                <div className="flex flex-col">
                  <p className="text-[13px] font-medium text-gray-700">
                    {step.title}
                  </p>
                  <p className="text-[12px] text-gray-400 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
