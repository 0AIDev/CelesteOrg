"use client";

import { useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function monthMatrix(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Shared month calendar grid. `selected` is a Set of date keys; `onPick`
 * receives a local Date (midnight). `markToday` renders the "today" accent.
 */
export function CalendarGrid({
  view,
  onViewChange,
  selected,
  onPick,
  markToday = true,
}: {
  view: { year: number; month: number };
  onViewChange: (v: { year: number; month: number }) => void;
  selected: Set<string>;
  onPick: (day: number) => void;
  markToday?: boolean;
}) {
  const cells = monthMatrix(view.year, view.month);
  const today = new Date();

  return (
    <div>
      {/* Month header */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            onViewChange(
              view.month === 0
                ? { year: view.year - 1, month: 11 }
                : { ...view, month: view.month - 1 },
            )
          }
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Previous month"
        >
          <CaretLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold text-gray-900">
          {MONTHS[view.month]} {view.year}
        </span>
        <button
          type="button"
          onClick={() =>
            onViewChange(
              view.month === 11
                ? { year: view.year + 1, month: 0 }
                : { ...view, month: view.month + 1 },
            )
          }
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Next month"
        >
          <CaretRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400"
          >
            {w}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) return <span key={`e-${i}`} />;
          const cellDate = new Date(view.year, view.month, day);
          const key = dateKey(cellDate);
          const isSelected = selected.has(key);
          const isToday = markToday && key === dateKey(today);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(day)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12.5px] transition-colors ${
                isSelected
                  ? "bg-gray-900 font-semibold text-white"
                  : isToday
                    ? "font-semibold text-gray-900 ring-1 ring-gray-300"
                    : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
