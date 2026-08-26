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

export const mainNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: House },
  { label: "Org Chart", href: "/org-chart", icon: TreeStructure },
  { label: "Teams", href: "/teams", icon: UsersThree },
  { label: "Chat", href: "/chat", icon: ChatCircleText },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Calendar", href: "/calendar", icon: CalendarBlank },
  { label: "Ideas", href: "/ideas", icon: Lightbulb },
  { label: "Reports", href: "/reports", icon: ClipboardText },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck },
  { label: "Equity", href: "/equity", icon: Coins },
  { label: "GitHub", href: "/github", icon: GithubLogo },
  { label: "Prompt Vault", href: "/prompt-vault", icon: Lightning },
  { label: "Tasks", href: "/tasks", icon: Kanban },
  { label: "Issues", href: "/issues", icon: Warning },
  { label: "Recordings", href: "/recordings", icon: VideoCamera },
  { label: "CRM", href: "/crm", icon: UsersThree },
  { label: "Social Planner", href: "/social-planner", icon: RocketLaunch },
];

export const shortcuts: NavItem[] = [
  { label: "Standups", icon: Sparkle, action: "standup" },
  { label: "Onboarding", href: "/onboarding", icon: RocketLaunch },
  { label: "Realtime AI Usage", href: "/ai-usage", icon: Gauge },
];

export const bottomNav: NavItem[] = [
  { label: "Developers", href: "/developers", icon: Plugs },
  { label: "Settings", href: "/settings", icon: GearSix },
];
