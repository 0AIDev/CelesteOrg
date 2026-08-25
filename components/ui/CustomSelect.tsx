"use client";

import * as Select from "@radix-ui/react-select";
import { Check, CaretDown } from "@phosphor-icons/react";

export type SelectOption = { value: string; label: string };

/** Radix-powered select styled like the rest of the UI (no native <select>). */
export function CustomSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className = "",
  disabled,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  // Radix Select treats "" as a real selection, which breaks the placeholder.
  // Normalize empty state to a "none" sentinel and report "" to callers.
  const current = value || "none";
  const selected = options.find((o) => o.value === value);
  return (
    <Select.Root
      value={current}
      onValueChange={(v) => onValueChange(v === "none" ? "" : v)}
      disabled={disabled}
    >
      <Select.Trigger
        className={`input flex w-full items-center justify-between gap-2 text-left ${disabled ? "opacity-50" : ""} ${className}`}
        aria-label={placeholder}
      >
        <Select.Value asChild>
          <span className={selected ? "text-gray-900" : "text-gray-400"}>
            {selected ? selected.label : placeholder}
          </span>
        </Select.Value>
        <Select.Icon>
          <CaretDown className="h-4 w-4 shrink-0 text-gray-400" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          className="z-[70] max-h-64 min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
        >
          <Select.Viewport>
            <Select.Item
              value="none"
              className="hidden"
            >
              <Select.ItemText> </Select.ItemText>
            </Select.Item>
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="flex cursor-pointer select-none items-center justify-between rounded-lg px-2.5 py-2 text-[13px] text-gray-700 outline-none data-[highlighted]:bg-gray-100 data-[state=checked]:font-medium data-[state=checked]:text-gray-900"
              >
                <Select.ItemText>{o.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check className="h-3.5 w-3.5 text-gray-900" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
