export type Department = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  previous_companies: string[] | null;
  role_title: string | null;
  department_id: string | null;
  is_founder: boolean;
  joined_at: string | null;
};

export type Role = {
  id: string;
  title: string;
  department_id: string | null;
  profile_id: string;
  reports_to: string | null;
  level: number;
};

export type EquityGrant = {
  id: string;
  user_id: string;
  total_shares: number;
  vested_shares: number;
  unvested_shares: number;
  vesting_start: string;
  cliff_months: number;
  schedule_type: "monthly" | "yearly";
};

export type OnboardingTask = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: "pending" | "in_progress" | "done" | "blocked";
  due_date: string | null;
  assigned_by: string | null;
};

export type Document = {
  id: string;
  title: string;
  file_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  category: string | null;
  owner_id: string;
  requires_signature: boolean;
  uploaded_at: string;
};

export type Idea = {
  id: string;
  author_id: string;
  title: string;
  content: string | null;
  category: string | null;
  priority: "low" | "medium" | "high";
  status: "new" | "backlog" | "planned" | "done" | "archived";
  ai_summary: string | null;
  created_at: string;
};

export type DailyReport = {
  id: string;
  user_id: string;
  date: string;
  morning_plan: string | null;
  eod_summary: string | null;
  blockers: string | null;
  status: "morning_pending" | "eod_pending" | "submitted";
  updated_at: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  type: "vacation" | "remote" | "sick" | "meeting";
  start_time: string;
  end_time: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
};

export type Approval = {
  id: string;
  requester_id: string;
  approver_id: string | null;
  manager_id: string | null;
  type: "timeoff" | "onboarding" | "equity" | "document" | "onboarding_task" | "general";
  target_id: string | null;
  summary: string;
  status: "pending" | "approved" | "rejected";
  comment: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type Approver = Profile & { reports_to: string | null };

// Org tree node for the org-chart page.
export type OrgNode = Profile & {
  roleId: string;
  title: string;
  departmentName?: string | null;
  reports: OrgNode[];
};