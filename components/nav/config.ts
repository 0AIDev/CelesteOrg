import {
  House,
  TreeStructure,
  UsersThree,
  FileText,
  CalendarBlank,
  Lightbulb,
  ClipboardText,
  Plugs,
  GearSix,
  Sparkle,
  ShieldCheck,
  RocketLaunch,
  Gauge,
  Coins,
  GithubLogo,
  Lightning,
  Kanban,
  VideoCamera,
  Warning,
  ChatCircleText,
  PushPin,
  Code,
  ChartLineUp,
  Notebook,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export type NavItem = {
  label: string;
  href?: string;
  icon: Icon;
  badge?: string;
  action?: "standup";
  adminOnly?: boolean;
};

export type NavCategory = {
  label: string;
  items: NavItem[];
};

// ─── Top-level navigation (always visible, no menu) ─────────────────
export const topNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: House },
  { label: "CEO Dashboard", href: "/dashboards", icon: ChartLineUp, adminOnly: true },
  { label: "Org Chart", href: "/org-chart", icon: TreeStructure },
  { label: "Teams", href: "/teams", icon: UsersThree },
  { label: "Chat", href: "/chat", icon: ChatCircleText },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Calendar", href: "/calendar", icon: CalendarBlank },
  { label: "Tasks", href: "/tasks", icon: Kanban },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck },
  { label: "Notion", href: "/notion", icon: Notebook },
];

// ─── Collapsible menus (less important items) ───────────────────────
export const categories: NavCategory[] = [
  {
    label: "Insights",
    items: [
      { label: "Ideas", href: "/ideas", icon: Lightbulb },
      { label: "Reports", href: "/reports", icon: ClipboardText },
      { label: "Issues", href: "/issues", icon: Warning },
    ],
  },
  {
    label: "Finance & Growth",
    items: [
      { label: "Equity", href: "/equity", icon: Coins },
      { label: "CRM", href: "/crm", icon: UsersThree },
      { label: "Social Planner", href: "/social-planner", icon: RocketLaunch },
    ],
  },
  {
    label: "Developer",
    items: [
      { label: "GitHub", href: "/github", icon: GithubLogo },
      { label: "Prompt Vault", href: "/prompt-vault", icon: Lightning },
      { label: "Skills Creator", href: "/skills-creator", icon: Code },
      { label: "Recordings", href: "/recordings", icon: VideoCamera },
    ],
  },
];

// ─── Pinned items (defaults) ────────────────────────────────────────
export const defaultPinned: NavItem[] = [
  { label: "Standups", icon: Sparkle, action: "standup" },
  { label: "Onboarding", href: "/onboarding", icon: RocketLaunch },
  { label: "Realtime AI Usage", href: "/ai-usage", icon: Gauge },
];

// ─── Bottom nav (always visible) ────────────────────────────────────
export const bottomNav: NavItem[] = [
  { label: "Developers", href: "/developers", icon: Plugs },
  { label: "Settings", href: "/settings", icon: GearSix },
];

// ─── All nav items flat (for pin search, CMDK, etc.) ────────────────
export const allNavItems: NavItem[] = [
  ...topNav,
  ...categories.flatMap((c) => c.items),
  ...defaultPinned,
  ...bottomNav,
];

// ─── Helpers ──────────────────────────────────────────────────────────
export const PINNED_STORAGE_KEY = "celeste-pinned-items";

export function getPinnedItems(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    // Deduplicate by keeping unique labels
    return [...new Set(parsed)];
  } catch {
    return [];
  }
}

export function setPinnedItems(labels: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(labels));
  } catch {
    /* ignore */
  }
}

export function togglePin(label: string): string[] {
  const current = getPinnedItems();
  const next = current.includes(label)
    ? current.filter((l) => l !== label)
    : [...current, label];
  setPinnedItems(next);
  return next;
}
