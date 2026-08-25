"use client";

import { Funnel } from "@phosphor-icons/react";
import { DateRangePicker, type DateRange } from "@/components/ui/DateRangePicker";
import { CustomSelect, type SelectOption } from "@/components/ui/CustomSelect";

/**
 * Reusable filter bar: date range + optional member + optional status.
 * Every filter is optional; pass null to hide it. Filter state lives in the
 * parent (typically persisted in the URL via useUrlParam).
 */
export function FilterBar({
  range,
  onRangeChange,
  members,
  memberValue,
  onMemberChange,
  statuses,
  statusValue,
  onStatusChange,
  compact = false,
}: {
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  members?: SelectOption[];
  memberValue?: string;
  onMemberChange?: (v: string) => void;
  statuses?: SelectOption[];
  statusValue?: string;
  onStatusChange?: (v: string) => void;
  compact?: boolean;
}) {
  const hasAny =
    !!range.start ||
    (members && memberValue !== undefined && memberValue !== "") ||
    (statuses && statusValue !== undefined && statusValue !== "");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        <Funnel className="h-3 w-3" />
        Filters
      </span>
      <DateRangePicker
        value={range}
        onChange={onRangeChange}
        placeholder="Date range…"
        className={compact ? "w-40" : "w-52"}
      />
      {members && onMemberChange && (
        <CustomSelect
          value={memberValue ?? ""}
          onValueChange={onMemberChange}
          options={members}
          placeholder="All members…"
          className={compact ? "w-40" : "w-44"}
        />
      )}
      {statuses && onStatusChange && (
        <CustomSelect
          value={statusValue ?? ""}
          onValueChange={onStatusChange}
          options={statuses}
          placeholder="All statuses…"
          className={compact ? "w-36" : "w-40"}
        />
      )}
      {hasAny && (
        <button
          onClick={() => {
            onRangeChange({ start: null, end: null });
            if (onMemberChange) onMemberChange("");
            if (onStatusChange) onStatusChange("");
          }}
          className="text-[12px] font-medium text-gray-900 hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
