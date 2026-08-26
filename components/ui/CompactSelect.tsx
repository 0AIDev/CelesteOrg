"use client";

import * as Select from "@radix-ui/react-select";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type CompactSelectOption = { value: string; label: string };

/** Compact Radix-powered select for inline use (tables, cards). */
export function CompactSelect({
  value,
  onValueChange,
  options,
  className,
  onClick,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: CompactSelectOption[];
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        onClick={onClick}
        className={cn(
          "inline-flex h-6 items-center gap-1 rounded-md border border-gray-200 bg-white pl-2 pr-5 text-[11px] text-gray-600 outline-none transition-colors hover:border-gray-300 focus:border-gray-300",
          className,
        )}
      >
        <Select.Value />
        <Select.Icon>
          <CaretDown className="absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-gray-400" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          className="z-[70] max-h-48 min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-0.5 shadow-md"
        >
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="cursor-pointer rounded-md px-2.5 py-1.5 text-[11px] text-gray-600 outline-none data-[highlighted]:bg-gray-100 data-[state=checked]:font-medium data-[state=checked]:text-gray-900"
              >
                <Select.ItemText>{o.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
