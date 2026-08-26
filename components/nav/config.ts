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
  ChartLineUp,
  Megaphone,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export type NavItem = {
  label: string;
  href?: string;
  icon: Icon;
  badge?: string;
  /** Sidebar-only action buttons (rendered without a link). */
  action?: "standup";
};

export type NavCategory = {
  label: string;
  items: NavItem[];
};

// ─── Categorized navigation ─────────────────────────────────────────
export const categories: NavCategory[] = [
  {
    label: "People",
    items: [
      { label: "Org Chart", href: "/org-chart", icon: TreeStructure },
      { label: "Teams", href: "/teams", icon: UsersThree },
      { label: "Chat", href: "/chat", icon: ChatCircleText },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Documents", href: "/documents", icon: FileText },
      { label: "Calendar", href: "/calendar", icon: CalendarBlank },
      { label: "Tasks", href: "/tasks", icon: Kanban },
      { label: "Issues", href: "/issues", icon: Warning },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "Ideas", href: "/ideas", icon: Lightbulb },
      { label: "Reports", href: "/reports", icon: ClipboardText },
      { label: "Approvals", href: "/approvals", icon: ShieldCheck },
    ],
  },
  {
    label: "Finance",
    items: [{ label: "Equity", href: "/equity", icon: Coins }],
  },
  {
    label: "Development",
    items: [
      { label: "GitHub", href: "/github", icon: GithubLogo },
      { label: "Prompt Vault", href: "/prompt-vault", icon: Lightning },
      { label: "Recordings", href: "/recordings", icon: VideoCamera },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "CRM", href: "/crm", icon: UsersThree },
      { label: "Social Planner", href: "/social-planner", icon: RocketLaunch },
    ],
  },
];

// Top-level items (not in a category)
export const topNav: NavItem[] = [{ label: "Home", href: "/dashboard", icon: House }];

// Pinned items (defaults — user can override via hover)
export const defaultPinned: NavItem[] = [
  { label: "Standups", icon: Sparkle, action: "standup" },
  { label: "Onboarding", href: "/onboarding", icon: RocketLaunch },
  { label: "Realtime AI Usage", href: "/ai-usage", icon: Gauge },
];

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
/** localStorage key for user-pinned items */
export const PINNED_STORAGE_KEY = "celeste-pinned-items";

/** Get pinned item labels from localStorage */
export function getPinnedItems(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save pinned item labels to localStorage */
export function setPinnedItems(labels: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(labels));
  } catch {
    /* ignore */
  }
}

/** Toggle a pin on/off */
export function togglePin(label: string): string[] {
  const current = getPinnedItems();
  const next = current.includes(label)
    ? current.filter((l) => l !== label)
    : [...current, label];
  setPinnedItems(next);
  return next;
}
