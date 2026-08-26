"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  X,
  FunnelSimple,
  List,
  Kanban,
  Spinner,
  Check,
  Trash,
  CaretDown,
  CaretRight,
  PencilSimple,
  Warning,
  ArrowUp,
  ArrowRight,
  Minus,
  ArrowDown,
  WarningCircle,
  Circle,
  CheckCircle,
  Clock,
  CircleDashed,
  CircleHalf,
} from "@phosphor-icons/react";
import {
  getIssues,
  createIssue,
  updateIssue,
  deleteIssue,
  moveIssue,
  getComments,
  addComment,
  getTeamMembers,
  type Issue,
  type IssueStatus,
  type IssuePriority,
  type IssueComment,
} from "@/app/actions/issue-actions";
import { useSession } from "@/components/layout/LayoutProvider";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

const COLUMNS: { key: IssueStatus; label: string; icon: typeof Circle }[] = [
  { key: "backlog", label: "Backlog", icon: CircleDashed },
  { key: "todo", label: "To Do", icon: Circle },
  { key: "in_progress", label: "In Progress", icon: CircleHalf },
  { key: "in_review", label: "In Review", icon: Clock },
  { key: "done", label: "Done", icon: CheckCircle },
];

const PRIORITY_ORDER: IssuePriority[] = ["urgent", "high", "medium", "low"];

const PROJECT_TRACKS = ["All", "Core AI", "Frontend", "Infrastructure", "Design", "General"];

// ─── Main Component ──────────────────────────────────────────────────────────

export function IssueTracker() {
  const { user } = useSession();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterPriority, setFilterPriority] = useState<IssuePriority | "">("");
  const [filterTrack, setFilterTrack] = useState("All");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterStatus, setFilterStatus] = useState<IssueStatus | "">("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string; avatar_url: string | null }[]>([]);

  const loadIssues = useCallback(async () => {
    const data = await getIssues();
    setIssues(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadIssues();
    getTeamMembers().then(setTeamMembers);
  }, [loadIssues]);

  // Filter logic
  const filtered = issues.filter((issue) => {
    if (filterPriority && issue.priority !== filterPriority) return false;
    if (filterTrack !== "All" && issue.project_track !== filterTrack) return false;
    if (filterAssignee && issue.assignee_id !== filterAssignee) return false;
    if (filterStatus && issue.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !issue.title.toLowerCase().includes(q) &&
        !issue.description?.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  // Group by status for kanban
  const grouped: Record<IssueStatus, Issue[]> = {
    backlog: [],
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
  };
  filtered.forEach((issue) => {
    grouped[issue.status]?.push(issue);
  });

  async function handleStatusChange(issueId: string, newStatus: IssueStatus) {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i)),
    );
    await moveIssue(issueId, newStatus, 0);
  }

  async function handlePriorityChange(issueId: string, newPriority: IssuePriority) {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, priority: newPriority } : i)),
    );
    await updateIssue(issueId, { priority: newPriority });
  }

  async function handleDeleteIssue(issueId: string) {
    if (!confirm("Delete this issue?")) return;
    setIssues((prev) => prev.filter((i) => i.id !== issueId));
    setSelectedIssue(null);
    await deleteIssue(issueId);
  }

  const activeFilterCount = [filterPriority, filterTrack !== "All" ? filterTrack : "", filterAssignee, filterStatus, searchQuery].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Issues</h1>
          <p className="mt-0.5 text-sm text-gray-500">Track bugs, feature requests, and tasks</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 bg-white">
            <button
              onClick={() => setView("kanban")}
              className={cn(
                "flex items-center gap-1.5 rounded-l-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                view === "kanban"
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-50",
              )}
            >
              <Kanban className="h-3.5 w-3.5" />
              Board
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-r-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                view === "list"
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-50",
              )}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-gray-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New Issue
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search issues..."
            className="h-8 w-48 rounded-lg border border-gray-200 bg-white pl-8 pr-2 text-[12px] outline-none focus:border-gray-300"
          />
          <FunnelSimple className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Priority filter */}
        <CustomSelect
          value={filterPriority}
          onChange={(v) => setFilterPriority(v as IssuePriority | "")}
          options={[{ value: "", label: "All priorities" }, ...PRIORITY_ORDER.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))]}
        />

        {/* Track filter */}
        <CustomSelect
          value={filterTrack}
          onChange={setFilterTrack}
          options={PROJECT_TRACKS.map((t) => ({ value: t, label: t }))}
        />

        {/* Assignee filter */}
        <CustomSelect
          value={filterAssignee}
          onChange={setFilterAssignee}
          options={[
            { value: "", label: "All members" },
            ...teamMembers.map((m) => ({ value: m.id, label: m.full_name })),
          ]}
        />

        {/* Clear */}
        {activeFilterCount > 0 && (
          <button
            onClick={() => {
              setFilterPriority("");
              setFilterTrack("All");
              setFilterAssignee("");
              setFilterStatus("");
              setSearchQuery("");
            }}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-50"
          >
            <X className="h-3 w-3" />
            Clear ({activeFilterCount})
          </button>
        )}

        <span className="ml-auto text-[11px] text-gray-400">
          {filtered.length} issue{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Board / List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-5 w-5 animate-spin text-gray-300" />
        </div>
      ) : view === "kanban" ? (
        <KanbanBoard
          grouped={grouped}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          onSelectIssue={setSelectedIssue}
        />
      ) : (
        <ListView
          issues={filtered}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          onSelectIssue={setSelectedIssue}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateIssueModal
          onClose={() => setShowCreate(false)}
          onCreate={async (data) => {
            const res = await createIssue(data);
            if (res.ok && res.issue) {
              setIssues((prev) => [res.issue!, ...prev]);
              setShowCreate(false);
            }
          }}
          teamMembers={teamMembers}
        />
      )}

      {/* Detail panel */}
      {selectedIssue && (
        <IssueDetailPanel
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onUpdate={async (changes) => {
            await updateIssue(selectedIssue.id, changes);
            setIssues((prev) =>
              prev.map((i) => (i.id === selectedIssue.id ? { ...i, ...changes } : i)),
            );
            setSelectedIssue((prev) => (prev ? { ...prev, ...changes } : null));
          }}
          onDelete={() => handleDeleteIssue(selectedIssue.id)}
          teamMembers={teamMembers}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
}

// ─── Kanban Board ────────────────────────────────────────────────────────────

function KanbanBoard({
  grouped,
  onStatusChange,
  onPriorityChange,
  onSelectIssue,
}: {
  grouped: Record<IssueStatus, Issue[]>;
  onStatusChange: (id: string, status: IssueStatus) => void;
  onPriorityChange: (id: string, priority: IssuePriority) => void;
  onSelectIssue: (issue: Issue) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const Icon = col.icon;
        return (
          <div key={col.key} className="min-w-[280px] flex-1">
            <div className="mb-3 flex items-center gap-2">
              <Icon className="h-4 w-4 text-gray-400" />
              <h3 className="text-[13px] font-medium text-gray-700">{col.label}</h3>
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                {grouped[col.key].length}
              </span>
            </div>
            <div
              className="space-y-2 min-h-[120px] rounded-xl border border-dashed border-gray-200 p-2 transition-colors hover:border-gray-300"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const issueId = e.dataTransfer.getData("text/issue-id");
                if (issueId) onStatusChange(issueId, col.key);
              }}
            >
              {grouped[col.key].map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onClick={() => onSelectIssue(issue)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Issue Card ──────────────────────────────────────────────────────────────

function IssueCard({
  issue,
  onClick,
}: {
  issue: Issue;
  onClick: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/issue-id", issue.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-gray-200 bg-white p-3 transition-all hover:border-gray-300 hover:shadow-sm"
    >
      {/* Priority + Track */}
      <div className="mb-2 flex items-center gap-1.5">
        <PriorityBadge priority={issue.priority} />
        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
          {issue.project_track}
        </span>
      </div>

      {/* Title */}
      <p className="text-[13px] font-medium leading-snug text-gray-900 line-clamp-2">
        {issue.title}
      </p>

      {/* Description preview */}
      {issue.description && (
        <p className="mt-1 text-[11px] text-gray-400 line-clamp-2">{issue.description}</p>
      )}

      {/* Bottom row */}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {issue.comment_count != null && issue.comment_count > 0 && (
            <span className="text-[10px] text-gray-400">{issue.comment_count}</span>
          )}
          {issue.due_date && (
            <span className="text-[10px] text-gray-400">
              {new Date(issue.due_date).toLocaleDateString([], { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
        {issue.assignee_name && (
          <SquircleAvatar name={issue.assignee_name} src={issue.assignee_avatar} size="xs" />
        )}
      </div>
    </div>
  );
}

// ─── List View ───────────────────────────────────────────────────────────────

function ListView({
  issues,
  onStatusChange,
  onPriorityChange,
  onSelectIssue,
}: {
  issues: Issue[];
  onStatusChange: (id: string, status: IssueStatus) => void;
  onPriorityChange: (id: string, priority: IssuePriority) => void;
  onSelectIssue: (issue: Issue) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="px-4 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Issue</th>
            <th className="px-4 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Status</th>
            <th className="px-4 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Priority</th>
            <th className="px-4 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Track</th>
            <th className="px-4 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Assignee</th>
            <th className="px-4 py-2.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Date</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr
              key={issue.id}
              onClick={() => onSelectIssue(issue)}
              className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50 last:border-0"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <PriorityIcon priority={issue.priority} />
                  <span className="text-[13px] font-medium text-gray-900">{issue.title}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusDropdown
                  status={issue.status}
                  onChange={(s) => onStatusChange(issue.id, s)}
                />
              </td>
              <td className="px-4 py-3">
                <PriorityDropdown
                  priority={issue.priority}
                  onChange={(p) => onPriorityChange(issue.id, p)}
                />
              </td>
              <td className="px-4 py-3">
                <span className="text-[12px] text-gray-500">{issue.project_track}</span>
              </td>
              <td className="px-4 py-3">
                {issue.assignee_name ? (
                  <div className="flex items-center gap-1.5">
                    <SquircleAvatar name={issue.assignee_name} src={issue.assignee_avatar} size="xs" />
                    <span className="text-[12px] text-gray-600">{issue.assignee_name}</span>
                  </div>
                ) : (
                  <span className="text-[12px] text-gray-300">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="text-[11px] text-gray-400">
                  {new Date(issue.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                </span>
              </td>
            </tr>
          ))}
          {issues.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-gray-400">
                No issues found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Priority Badge ──────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: IssuePriority }) {
  const styles: Record<IssuePriority, string> = {
    urgent: "bg-red-50 text-red-600 border-red-200",
    high: "bg-orange-50 text-orange-600 border-orange-200",
    medium: "bg-gray-50 text-gray-600 border-gray-200",
    low: "bg-gray-50 text-gray-400 border-gray-100",
  };
  return (
    <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-medium", styles[priority])}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

function PriorityIcon({ priority }: { priority: IssuePriority }) {
  const icons: Record<IssuePriority, typeof Circle> = {
    urgent: WarningCircle,
    high: ArrowUp,
    medium: ArrowRight,
    low: ArrowDown,
  };
  const colors: Record<IssuePriority, string> = {
    urgent: "text-red-500",
    high: "text-orange-500",
    medium: "text-gray-400",
    low: "text-gray-300",
  };
  const Icon = icons[priority];
  return <Icon className={cn("h-4 w-4 shrink-0", colors[priority])} />;
}

// ─── Dropdowns ───────────────────────────────────────────────────────────────

function CustomSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 appearance-none rounded-lg border border-gray-200 bg-white pl-2.5 pr-7 text-[12px] text-gray-700 outline-none focus:border-gray-300"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <CaretDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

function StatusDropdown({
  status,
  onChange,
}: {
  status: IssueStatus;
  onChange: (s: IssueStatus) => void;
}) {
  return (
    <div className="relative">
      <select
        value={status}
        onChange={(e) => onChange(e.target.value as IssueStatus)}
        onClick={(e) => e.stopPropagation()}
        className="h-6 appearance-none rounded-md border border-gray-200 bg-white pl-2 pr-6 text-[11px] text-gray-600 outline-none focus:border-gray-300"
      >
        {COLUMNS.map((c) => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>
      <CaretDown className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

function PriorityDropdown({
  priority,
  onChange,
}: {
  priority: IssuePriority;
  onChange: (p: IssuePriority) => void;
}) {
  return (
    <div className="relative">
      <select
        value={priority}
        onChange={(e) => onChange(e.target.value as IssuePriority)}
        onClick={(e) => e.stopPropagation()}
        className="h-6 appearance-none rounded-md border border-gray-200 bg-white pl-2 pr-6 text-[11px] text-gray-600 outline-none focus:border-gray-300"
      >
        {PRIORITY_ORDER.map((p) => (
          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
        ))}
      </select>
      <CaretDown className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

// ─── Create Issue Modal ──────────────────────────────────────────────────────

function CreateIssueModal({
  onClose,
  onCreate,
  teamMembers,
}: {
  onClose: () => void;
  onCreate: (data: {
    title: string;
    description?: string;
    priority?: IssuePriority;
    project_track?: string;
    assignee_id?: string;
  }) => Promise<void>;
  teamMembers: { id: string; full_name: string; avatar_url: string | null }[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [track, setTrack] = useState("General");
  const [assignee, setAssignee] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim() || saving) return;
    setSaving(true);
    await onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      project_track: track,
      assignee_id: assignee || undefined,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-0 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">New Issue</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-[12px] font-medium text-gray-500">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Bug: Login fails on mobile Safari"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-[12px] font-medium text-gray-500">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Steps to reproduce, expected vs actual behavior... (Markdown supported)"
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 font-mono text-[12px] leading-relaxed text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
            />
          </div>

          {/* Priority + Track row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-gray-500">Priority</label>
              <div className="flex gap-1.5">
                {PRIORITY_ORDER.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                      priority === p
                        ? "bg-gray-900 text-white"
                        : "border border-gray-200 text-gray-500 hover:bg-gray-50",
                    )}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-gray-500">Track</label>
              <CustomSelect
                value={track}
                onChange={setTrack}
                options={PROJECT_TRACKS.filter((t) => t !== "All").map((t) => ({ value: t, label: t }))}
              />
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="mb-1 block text-[12px] font-medium text-gray-500">Assignee</label>
            <CustomSelect
              value={assignee}
              onChange={setAssignee}
              options={[
                { value: "", label: "Unassigned" },
                ...teamMembers.map((m) => ({ value: m.id, label: m.full_name })),
              ]}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
          <button onClick={onClose} className="text-[12px] font-medium text-gray-400 hover:text-gray-700">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!title.trim() || saving}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-[12px] font-medium text-white hover:bg-gray-700 disabled:opacity-40"
          >
            {saving ? <Spinner className="h-3 w-3 animate-spin" /> : null}
            Create Issue
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Issue Detail Panel ──────────────────────────────────────────────────────

type IssueChanges = {
  title?: string;
  description?: string | null;
  status?: IssueStatus;
  priority?: IssuePriority;
  project_track?: string;
  assignee_id?: string | null;
  position?: number;
  due_date?: string | null;
  labels?: string[];
};

function IssueDetailPanel({
  issue,
  onClose,
  onUpdate,
  onDelete,
  teamMembers,
  currentUserId,
}: {
  issue: Issue;
  onClose: () => void;
  onUpdate: (changes: IssueChanges) => Promise<void>;
  onDelete: () => void;
  teamMembers: { id: string; full_name: string; avatar_url: string | null }[];
  currentUserId?: string;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(issue.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(issue.description || "");
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(true);

  useEffect(() => {
    getComments(issue.id).then((c) => {
      setComments(c);
      setLoadingComments(false);
    });
  }, [issue.id]);

  async function saveTitle() {
    if (titleValue.trim() && titleValue !== issue.title) {
      await onUpdate({ title: titleValue.trim() });
    }
    setEditingTitle(false);
  }

  async function saveDesc() {
    if (descValue !== (issue.description || "")) {
      await onUpdate({ description: descValue.trim() || null });
    }
    setEditingDesc(false);
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    const res = await addComment(issue.id, commentText.trim());
    if (res.ok && res.comment) {
      setComments((prev) => [...prev, res.comment!]);
      setCommentText("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm">
      <div className="h-full w-full max-w-xl border-l border-gray-200 bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3">
          <div className="flex items-center gap-2">
            <PriorityIcon priority={issue.priority} />
            <span className="text-[11px] text-gray-400">
              {issue.project_track}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onDelete}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
            >
              <Trash className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          {/* Title */}
          {editingTitle ? (
            <input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && saveTitle()}
              className="w-full text-lg font-semibold text-gray-900 outline-none"
            />
          ) : (
            <h2
              onClick={() => setEditingTitle(true)}
              className="cursor-pointer text-lg font-semibold text-gray-900 hover:text-gray-700"
            >
              {issue.title}
            </h2>
          )}

          {/* Metadata grid */}
          <div className="mt-5 grid grid-cols-2 gap-4">
            {/* Status */}
            <MetaRow label="Status">
              <StatusDropdown
                status={issue.status}
                onChange={(s) => onUpdate({ status: s })}
              />
            </MetaRow>

            {/* Priority */}
            <MetaRow label="Priority">
              <PriorityDropdown
                priority={issue.priority}
                onChange={(p) => onUpdate({ priority: p })}
              />
            </MetaRow>

            {/* Track */}
            <MetaRow label="Track">
              <CustomSelect
                value={issue.project_track}
                onChange={(v) => onUpdate({ project_track: v })}
                options={PROJECT_TRACKS.filter((t) => t !== "All").map((t) => ({ value: t, label: t }))}
              />
            </MetaRow>

            {/* Assignee */}
            <MetaRow label="Assignee">
              <CustomSelect
                value={issue.assignee_id || ""}
                onChange={(v) => onUpdate({ assignee_id: v || null })}
                options={[
                  { value: "", label: "Unassigned" },
                  ...teamMembers.map((m) => ({ value: m.id, label: m.full_name })),
                ]}
              />
            </MetaRow>

            {/* Created */}
            <MetaRow label="Created">
              <span className="text-[12px] text-gray-600">
                {new Date(issue.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </MetaRow>

            {/* Creator */}
            <MetaRow label="Creator">
              <span className="text-[12px] text-gray-600">{issue.creator_name}</span>
            </MetaRow>
          </div>

          {/* Description */}
          <div className="mt-6">
            <h3 className="mb-2 text-[12px] font-medium text-gray-500">Description</h3>
            {editingDesc ? (
              <div>
                <textarea
                  autoFocus
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  rows={6}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 font-mono text-[12px] leading-relaxed text-gray-900 outline-none focus:border-gray-300 focus:bg-white"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={saveDesc}
                    className="rounded-lg bg-gray-900 px-3 py-1 text-[11px] font-medium text-white hover:bg-gray-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setDescValue(issue.description || ""); setEditingDesc(false); }}
                    className="px-3 py-1 text-[11px] text-gray-400 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditingDesc(true)}
                className="cursor-pointer rounded-xl border border-gray-100 bg-gray-50 p-3.5 text-[13px] leading-relaxed text-gray-700 hover:bg-gray-100 min-h-[60px]"
              >
                {issue.description || <span className="text-gray-300 italic">Click to add a description...</span>}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="mt-6">
            <h3 className="mb-3 text-[12px] font-medium text-gray-500">
              Comments ({comments.length})
            </h3>

            {loadingComments ? (
              <div className="flex py-4 justify-center">
                <Spinner className="h-4 w-4 animate-spin text-gray-300" />
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <SquircleAvatar name={c.author_name ?? "?"} src={c.author_avatar} size="xs" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-gray-700">{c.author_name}</span>
                        <span className="text-[10px] text-gray-300">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[13px] text-gray-600 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment input */}
            <div className="mt-3 flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Add a comment..."
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-[13px] outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim()}
                className="rounded-xl bg-gray-900 px-3.5 py-2 text-[12px] font-medium text-white hover:bg-gray-700 disabled:opacity-30"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}
