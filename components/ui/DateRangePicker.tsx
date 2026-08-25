"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarBlank, X } from "@phosphor-icons/react";
import { CalendarGrid, dateKey, addDays } from "@/components/ui/CalendarGrid";

export type DateRange = { start: string | null; end: string | null };

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const PRESETS: { label: string; days: number }[] = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Select range…",
  className = "",
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // Draft selection while the popover is open (applied on Apply).
  const [draft, setDraft] = useState<DateRange>(value);
  const [views, setViews] = useState([
    { year: new Date().getFullYear(), month: new Date().getMonth() },
    { year: new Date().getMonth() === 11 ? new Date().getFullYear() + 1 : new Date().getFullYear(), month: (new Date().getMonth() + 1) % 12 },
  ]);

  function label() {
    if (!value.start || !value.end) return placeholder;
    const fmt = (s: string) =>
      new Date(s + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" });
    return `${fmt(value.start)} – ${fmt(value.end)}`;
  }

  function applyPreset(days: number) {
    const end = new Date();
    const start = addDays(end, -(days - 1));
    const r = { start: toISODate(start), end: toISODate(end) };
    setDraft(r);
    onChange(r);
    setOpen(false);
  }

  function clear() {
    setDraft({ start: null, end: null });
    onChange({ start: null, end: null });
    setOpen(false);
  }

  function pick(day: number, view: { year: number; month: number }) {
    const d = toISODate(new Date(view.year, view.month, day));
    setDraft((prev) => {
      // Start a new range if empty, or after a complete range.
      if (!prev.start || (prev.start && prev.end)) return { start: d, end: null };
      // Selecting an earlier date than the start → becomes the new start.
      if (d < prev.start) return { start: d, end: prev.start };
      return { start: prev.start, end: d };
    });
  }

  function apply() {
    if (draft.start && draft.end) {
      onChange({ start: draft.start, end: draft.end });
      setOpen(false);
    }
  }

  function selectedKeys() {
    const set = new Set<string>();
    if (!draft.start) return set;
    const end = draft.end ?? draft.start;
    let cur = new Date(draft.start + "T00:00:00");
    const last = new Date(end + "T00:00:00");
    while (cur <= last) {
      set.add(dateKey(cur));
      cur = addDays(cur, 1);
    }
    return set;
  }

  const hasRange = !!(draft.start && draft.end);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(value);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`input flex w-full items-center justify-between gap-2 text-left ${value.start ? "text-gray-900" : "text-gray-400"} ${className}`}
        >
          <span className="truncate">{label()}</span>
          {value.start ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  clear();
                }
              }}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Clear range"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : (
            <CalendarBlank className="h-4 w-4 shrink-0 text-gray-400" />
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="start"
          className="z-[70] w-[300px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl sm:w-[560px]"
        >
          {/* Presets */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b border-gray-100 pb-3">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.days)}
                className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11.5px] font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                {p.label}
              </button>
            ))}
            <span className="ml-auto text-[11px] tabular-nums text-gray-400">
              {hasRange ? `${draft.start} → ${draft.end}` : "Pick a start & end"}
            </span>
          </div>

          {/* Dual month */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <CalendarGrid
                key={i}
                view={views[i]}
                onViewChange={(v) =>
                  setViews((vs) => {
                    const next = [...vs];
                    next[i] = v;
                    // Keep the two months adjacent.
                    const other = i === 0 ? 1 : 0;
                    next[other] =
                      i === 0
                        ? { year: v.month === 11 ? v.year + 1 : v.year, month: (v.month + 1) % 12 }
                        : { year: v.month === 0 ? v.year - 1 : v.year, month: (v.month + 11) % 12 };
                    return next;
                  })
                }
                selected={selectedKeys()}
                onPick={(day) => pick(day, views[i])}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
            <button type="button" onClick={clear} className="btn-secondary !py-1.5">
              Clear
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!hasRange}
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-gray-700 disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
