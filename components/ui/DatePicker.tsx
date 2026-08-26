"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarBlank } from "@phosphor-icons/react";
import { CalendarGrid, dateKey } from "@/components/ui/CalendarGrid";

/**
 * Simple date-only picker (no time). Value format: "YYYY-MM-DD".
 * Uses the same CalendarGrid as DateTimePicker.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const base = value ? new Date(value + "T00:00:00") : new Date();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({
    year: base.getFullYear(),
    month: base.getMonth(),
  });
  const [draft, setDraft] = useState<Date>(base);

  function pickDate(day: number) {
    const d = new Date(view.year, view.month, day);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    onChange(iso);
    setOpen(false);
  }

  const display = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          const d = value ? new Date(value + "T00:00:00") : new Date();
          setDraft(d);
          setView({ year: d.getFullYear(), month: d.getMonth() });
        }
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`input flex w-full items-center justify-between gap-2 text-left ${display ? "text-gray-900" : "text-gray-400"} ${className}`}
        >
          <span className="truncate">{display ?? placeholder}</span>
          <CalendarBlank className="h-4 w-4 shrink-0 text-gray-400" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="start"
          className="z-[70] w-[280px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
        >
          <CalendarGrid
            view={view}
            onViewChange={setView}
            selected={new Set([dateKey(draft)])}
            onPick={pickDate}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
