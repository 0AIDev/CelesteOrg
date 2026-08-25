import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join("");
}

export function relativeTime(date?: string | Date | null) {
  if (!date) return "just now";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function fmtDate(date?: string | Date | null) {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy");
}

export function fmtBytes(bytes?: number | null) {
  if (bytes == null || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function fmtCost(cost?: number | null) {
  if (cost == null) return "$0.00";
  return `$${cost.toFixed(4)}`;
}