import { cn } from "@/lib/utils";

type Tone = "neutral" | "green" | "red" | "amber" | "blue" | "purple";

// Monochrome: every tone renders neutral gray (kept the union for call sites).
const tones: Record<Tone, string> = {
  neutral: "bg-gray-100 text-gray-600",
  green: "bg-gray-100 text-gray-600",
  red: "bg-gray-100 text-gray-600",
  amber: "bg-gray-100 text-gray-600",
  blue: "bg-gray-100 text-gray-600",
  purple: "bg-gray-100 text-gray-600",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("badge", tones[tone], className)}>{children}</span>
  );
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "approved":
    case "done":
    case "ok":
    case "active":
      return "green";
    case "rejected":
    case "sick":
    case "error":
      return "red";
    case "pending":
    case "in_progress":
    case "timeout":
    case "vacation":
    case "eod_pending":
      return "amber";
    case "submitted":
    case "planned":
    case "remote":
    case "meeting":
      return "blue";
    default:
      return "neutral";
  }
}