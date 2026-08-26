"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Mono font class for elapsed time. */
const mono =
  "font-mono text-[0.85em] tabular-nums tracking-tight";

/**
 * ShimmerLabel — text with a subtle shimmer animation (light sweep left to right).
 */
function ShimmerLabel({
  children,
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "relative inline-block leading-none",
        className,
      )}
      {...props}
    >
      {children}
      {/* Shimmer overlay */}
      <span
        aria-hidden
        className="absolute inset-0 overflow-hidden"
      >
        <span className="absolute inset-0 animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent bg-[length:200%_100%]" />
      </span>
    </span>
  );
}

/**
 * ThinkingIndicator — a live status line that names what the agent is doing right now.
 *
 * Usage:
 *   <ThinkingIndicator label="Drafting a reply" elapsed="12s" />
 */
export function ThinkingIndicator({
  label,
  elapsed,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "label" | "elapsed"> & {
  label: string;
  elapsed?: string;
}) {
  return (
    <div
      data-slot="thinking-indicator"
      className={cn(
        "flex items-center gap-2.5 text-[12.5px] text-gray-400",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-blue-500 motion-reduce:animate-none"
      />
      <ShimmerLabel
        key={label}
        className="animate-[fadeIn_0.3s_ease-out_both]"
      >
        {label}
      </ShimmerLabel>
      {elapsed !== undefined && (
        <span className={cn(mono, "text-gray-300 tabular-nums")}>
          {elapsed}
        </span>
      )}
    </div>
  );
}
