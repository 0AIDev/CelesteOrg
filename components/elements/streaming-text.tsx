"use client";

import { type ComponentProps, useMemo } from "react";
import { cn } from "@/lib/utils";

export interface Segment {
  text: string;
  mono?: boolean;
}

/** Take the first `n` items from an array. */
function take<T>(arr: T[], n: number): T[] {
  return arr.slice(0, Math.max(0, n));
}

/**
 * StreamingText — tokens arrive softly: the newest words land in blue and settle into ink.
 *
 * Usage:
 *   <StreamingText segments={[{ text: "Hello world" }]} count={3} streaming />
 */
export function StreamingText({
  segments,
  count,
  streaming,
  className,
  ...props
}: Omit<
  ComponentProps<"p">,
  "children" | "segments" | "count" | "streaming"
> & {
  segments: Segment[];
  count: number;
  streaming: boolean;
}) {
  const words = useMemo(
    () =>
      segments.flatMap((segment) =>
        segment.text
          .split(" ")
          .map((word) => ({ word, mono: segment.mono ?? false })),
      ),
    [segments],
  );
  const shown = take(words, count);

  return (
    <p
      data-slot="streaming-text"
      className={cn(
        "text-[13px] leading-relaxed text-pretty",
        className,
      )}
      {...props}
    >
      {shown.map(({ word, mono: isMono }, i) => {
        const fresh = streaming && shown.length - 1 - i < 2;
        return (
          <span
            key={i}
            className="inline-block animate-[fadeIn_0.5s_ease-out_both] motion-reduce:animate-none"
          >
            <span
              className={cn(
                "transition-colors duration-700 motion-reduce:transition-none",
                fresh && "text-blue-500",
                isMono &&
                  "bg-gray-100 rounded-md px-1.5 py-0.5 font-mono text-[0.85em]",
              )}
            >
              {word}
            </span>{" "}
          </span>
        );
      })}
      {streaming && shown.length > 0 && (
        <span
          aria-hidden
          className="-mb-0.5 ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-blue-500"
        />
      )}
    </p>
  );
}
