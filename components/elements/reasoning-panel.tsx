"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function take<T>(arr: T[], n: number): T[] {
  return arr.slice(0, Math.max(0, n));
}

export interface ReasoningStep {
  title: string;
  body: string;
}

export interface ReasoningPanelProps {
  steps: ReasoningStep[];
  visibleSteps: number;
  streaming: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restingLabel: string;
  elapsed?: string;
  className?: string;
}

export function ReasoningPanel({
  steps,
  visibleSteps,
  streaming,
  open,
  onOpenChange,
  restingLabel,
  elapsed,
  className,
}: ReasoningPanelProps) {
  const shown = take(steps, visibleSteps);

  return (
    <div data-slot="reasoning-panel" className={cn("w-full", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="group/trigger flex items-center gap-1.5 py-1 text-[13.5px] text-gray-500 transition-colors hover:text-gray-700 outline-none active:scale-[0.98]"
      >
        {streaming ? (
          <span className="relative inline-flex items-center gap-1.5">
            <span className="size-1.5 animate-pulse rounded-full bg-blue-500" />
            <span className="font-medium">Thinking</span>
            {elapsed && (
              <span className="font-mono text-[11px] text-gray-400 tabular-nums">
                {elapsed}
              </span>
            )}
          </span>
        ) : (
          <span className="font-medium">{restingLabel}</span>
        )}
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 opacity-60 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Steps */}
      {open && (
        <ol className="flex flex-col gap-4 pt-3 pb-1 fade-in animate-in fill-mode-both duration-300">
          {shown.map((step, i) => {
            const active = streaming && i === shown.length - 1;
            return (
              <li
                key={step.title}
                className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both flex gap-3 duration-300"
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-[7px] size-[5px] shrink-0 rounded-full transition-colors duration-300",
                    active
                      ? "animate-pulse bg-blue-500"
                      : "bg-gray-300",
                  )}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <p className="text-[13.5px] font-medium text-gray-700">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-gray-500 break-words">
                    {step.body}
                  </p>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
