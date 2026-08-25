"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarBlank, Clock, Warning } from "@phosphor-icons/react";
import { CalendarGrid, dateKey, addDays } from "@/components/ui/CalendarGrid";
import { CustomSelect } from "@/components/ui/CustomSelect";

// Value format: "YYYY-MM-DDTHH:mm" (local).

export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function parseInput(v: string): Date {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

const QUICK_DATES = [
  { label: "Today", delta: 0 },
  { label: "Tomorrow", delta: 1 },
  { label: "Next week", delta: 7 },
];

export type TimeConflict = {
  start: string; // ISO
  end: string; // ISO
  title: string;
};

/** IANA name + abbreviation of the browser's local timezone, e.g. "CEST (UTC+2)". */
export function localTimezoneLabel() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const abbr =
      new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "short" })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? tz;
    return `${abbr}`;
  } catch {
    return "";
  }
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
  className = "",
  conflicts,
  timezoneLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  /** Existing calendar events to warn about overlaps with. */
  conflicts?: TimeConflict[];
  /** Optional override for the displayed timezone (defaults to the browser's). */
  timezoneLabel?: string;
}) {
  const base = value ? parseInput(value) : new Date();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: base.getFullYear(), month: base.getMonth() });
  const [draft, setDraft] = useState<Date>(base);
  const [minuteText, setMinuteText] = useState(String(base.getMinutes()).padStart(2, "0"));

  function pickDate(day: number) {
    const d = new Date(view.year, view.month, day, draft.getHours(), draft.getMinutes());
    setDraft(d);
  }

  function setHour(h: string) {
    const d = new Date(draft);
    d.setHours(Number(h), draft.getMinutes());
    setDraft(d);
  }

  function setMinuteRaw(text: string) {
    setMinuteText(text);
    const n = Number(text);
    if (text.length === 2 && n >= 0 && n <= 59) {
      const d = new Date(draft);
      d.setMinutes(n);
      setDraft(d);
    }
  }

  function quickDate(delta: number) {
    const d = addDays(new Date(), delta);
    d.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
    setDraft(d);
    setView({ year: d.getFullYear(), month: d.getMonth() });
    setMinuteText(String(d.getMinutes()).padStart(2, "0"));
  }

  function apply() {
    onChange(toLocalInput(draft));
    setOpen(false);
  }

  const hourOptions = Array.from({ length: 24 }, (_, h) => ({
    value: String(h),
    label: String(h).padStart(2, "0"),
  }));

  // Overlap check against existing calendar events (excludes the event being
  // edited when `value` is inside its own range — the CalendarClient handles
  // that by filtering the current event out before passing conflicts).
  const clash = useMemo(() => {
    if (!conflicts?.length || !value) return null;
    const sel = new Date(value).getTime();
    return (
      conflicts.find((c) => {
        const s = new Date(c.start).getTime();
        const e = new Date(c.end).getTime();
        return sel >= s && sel < e;
      }) ?? null
    );
  }, [conflicts, value]);

  const tz = timezoneLabel ?? localTimezoneLabel();

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          const d = value ? parseInput(value) : new Date();
          setDraft(d);
          setView({ year: d.getFullYear(), month: d.getMonth() });
          setMinuteText(String(d.getMinutes()).padStart(2, "0"));
        }
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`input flex w-full items-center justify-between gap-2 text-left ${value ? "text-gray-900" : "text-gray-400"} ${className}`}
        >
          <span className="truncate">
            {value
              ? `${new Date(value).toLocaleString("en", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}${tz ? ` · ${tz}` : ""}`
              : placeholder}
          </span>
          <CalendarBlank className="h-4 w-4 shrink-0 text-gray-400" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="start"
          className="z-[70] w-[280px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
        >
          {/* Overlap warning */}
          {clash && (
            <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
              <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-900" />
              <p className="text-[11.5px] leading-snug text-gray-700">
                <span className="font-semibold">Overlap:</span> {clash.title} already
                occupies this slot.
              </p>
            </div>
          )}

          {/* Quick dates */}
          <div className="mb-2 flex gap-1.5">
            {QUICK_DATES.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => quickDate(q.delta)}
                className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[11.5px] font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                {q.label}
              </button>
            ))}
          </div>

          <CalendarGrid
            view={view}
            onViewChange={setView}
            selected={new Set([dateKey(draft)])}
            onPick={pickDate}
          />

          {/* Time — hour dropdown + free-form minutes */}
          <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
            <Clock className="h-4 w-4 shrink-0 text-gray-400" />
            <div className="flex items-center gap-1.5">
              <CustomSelect
                value={String(draft.getHours())}
                onValueChange={setHour}
                options={hourOptions}
                className="w-16 !px-2 !py-1.5 text-center"
              />
              <span className="text-gray-400">:</span>
              <input
                type="text"
                inputMode="numeric"
                value={minuteText}
                onChange={(e) => setMinuteRaw(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                onBlur={() => {
                  const n = Number(minuteText);
                  setMinuteText(Number.isFinite(n) && n >= 0 && n <= 59 ? String(n).padStart(2, "0") : "00");
                }}
                className="w-12 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-[12.5px] tabular-nums text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                aria-label="Minutes"
              />
            </div>
            <div className="ml-1 flex flex-col gap-0.5">
              {["00", "15", "30", "45"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinuteRaw(m)}
                  className="rounded px-1 py-px text-[10px] font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  :{m}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={apply}
              className="ml-auto rounded-lg bg-gray-900 px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-gray-700"
            >
              Apply
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
