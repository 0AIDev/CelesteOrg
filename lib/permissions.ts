// Shared permission catalog — safe to import from both server actions and
// client components. Rows live in `user_permissions` (user_id, feature,
// allowed). Absent row = allowed by default; the matrix only restricts.

export type PermissionKey =
  | "invites.send"
  | "teams.manage"
  | "org_chart.edit"
  | "documents.upload"
  | "documents.delete"
  | "documents.sign"
  | "calendar.edit"
  | "calendar.approve"
  | "equity.manage"
  | "ai_usage.view"
  | "ai_usage.manage"
  | "approvals.review"
  | "settings.manage"
  | "dashboards.view"
  | "ideas.create";

export const PERMISSIONS: {
  key: PermissionKey;
  label: string;
  description: string;
}[] = [
  { key: "invites.send", label: "Invite teammates", description: "Send team invites and generate invite links." },
  { key: "teams.manage", label: "Manage team", description: "Edit member profiles and team settings." },
  { key: "org_chart.edit", label: "Edit org chart", description: "Assign positions and move people in the chart." },
  { key: "documents.upload", label: "Upload documents", description: "Upload files to the company document vault." },
  { key: "documents.delete", label: "Delete documents", description: "Remove any document, not just their own." },
  { key: "documents.sign", label: "Manage signatures", description: "Send documents for signature and remind signers." },
  { key: "calendar.edit", label: "Edit calendar", description: "Create, move and delete calendar events." },
  { key: "calendar.approve", label: "Approve time-off", description: "Approve or reject vacation and remote requests." },
  { key: "equity.manage", label: "Manage equity", description: "Issue grants and edit the cap table." },
  { key: "ai_usage.view", label: "View AI usage", description: "See live token consumption and costs." },
  { key: "ai_usage.manage", label: "Manage AI keys", description: "Add and remove AI provider API keys." },
  { key: "approvals.review", label: "Review approvals", description: "Review and decide on pending approvals." },
  { key: "settings.manage", label: "Manage settings", description: "Change company-wide settings and security." },
  { key: "dashboards.view", label: "View dashboards", description: "See the role dashboards section." },
  { key: "ideas.create", label: "Submit ideas", description: "Post new ideas to the idea vault." },
];

export const PERMISSION_GROUP: Record<PermissionKey, string> = {
  "invites.send": "Team & org",
  "teams.manage": "Team & org",
  "org_chart.edit": "Team & org",
  "documents.upload": "Documents",
  "documents.delete": "Documents",
  "documents.sign": "Documents",
  "calendar.edit": "Calendar",
  "calendar.approve": "Calendar",
  "equity.manage": "Finance",
  "ai_usage.view": "AI",
  "ai_usage.manage": "AI",
  "approvals.review": "Governance",
  "settings.manage": "Governance",
  "dashboards.view": "Governance",
  "ideas.create": "Ideas",
};

export const PERMISSION_GROUPS = Array.from(
  new Set(Object.values(PERMISSION_GROUP)),
);

export function permissionLabel(key: string): string {
  return PERMISSIONS.find((p) => p.key === key)?.label ?? key;
}
