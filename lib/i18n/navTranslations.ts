import type { TranslationKeys } from "./translations";

// Maps English nav item labels to their i18n translation keys.
// Pinning uses English labels as identity; display uses translated text.
export const navLabelToKey: Record<string, keyof TranslationKeys> = {
  // Top nav
  Home: "sidebar.home",
  "CEO Dashboard": "sidebar.ceoDashboard",
  "Org Chart": "sidebar.orgChart",
  Teams: "sidebar.teams",
  Chat: "sidebar.chat",
  Documents: "sidebar.documents",
  Calendar: "sidebar.calendar",
  Tasks: "sidebar.tasks",
  Approvals: "sidebar.approvals",
  Notion: "sidebar.notion",

  // Categories
  Insights: "sidebar.insights",
  Ideas: "sidebar.ideas",
  Reports: "sidebar.reports",
  Issues: "sidebar.issues",
  "Finance & Growth": "sidebar.financeGrowth",
  Equity: "sidebar.equity",
  CRM: "sidebar.crm",
  "Social Planner": "sidebar.socialPlanner",
  Developer: "sidebar.developer",
  GitHub: "sidebar.github",
  "Prompt Vault": "sidebar.promptVault",
  "Skills Creator": "sidebar.skillsCreator",
  Recordings: "sidebar.recordings",

  // Bottom
  Developers: "sidebar.developers",
  Settings: "sidebar.settings",

  // Pinned
  Standups: "sidebar.standups",
  Onboarding: "sidebar.onboarding",
  "Realtime AI Usage": "sidebar.realtimeAiUsage",
};
