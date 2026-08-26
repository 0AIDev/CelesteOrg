"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  X,
  Trash,
  Spinner,
  CalendarBlank,
  ArrowUp,
  ArrowsClockwise,
  Circle,
  CheckCircle,
  Clock,
  Backspace,
  DotsThreeVertical,
} from "@phosphor-icons/react";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  createTask,
  moveTask,
  deleteTask,
  updateTask,
  type TaskRow,
} from "@/app/actions/task-actions";

// ── Column config ───────────────────────────────────────────────────────────
const COLUMNS = [
  {
    id: "backlog",
    label: "Backlog",
    icon: Backspace,
    color: "text-gray-400",
    bg: "bg-gray-50",
  },
  {
    id: "in_progress",
    label: "In Progress",
    icon: ArrowsClockwise,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    id: "in_review",
    label: "In Review",
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    id: "done",
    label: "Done",
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50",
  },
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: typeof ArrowUp }> = {
  urgent: { label: "Urgent", color: "text-red-500", icon: ArrowUp },
  medium: { label: "Medium", color: "text-gray-500", icon: Circle },
  low: { label: "Low", color: "text-gray-400", icon: Circle },
};

// ── Main component ──────────────────────────────────────────────────────────
export function TaskBoard({
  initialTasks = [],
  members = [],
  currentUserId,
}: {
  initialTasks?: TaskRow[];
  members?: { id: string; full_name: string | null; avatar_url: string | null }[];
  currentUserId?: string | null;
}) {
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [live, setLive] = useState(false);

  // Realtime
  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel("task-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as TaskRow;
            setTasks((prev) => {
              if (prev.some((t) => t.id === row.id)) return prev;
              return [...prev, row];
            });
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as TaskRow;
            setTasks((prev) => prev.map((t) => (t.id === row.id ? { ...t, ...row } : t)));
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string };
            setTasks((prev) => prev.filter((t) => t.id !== old.id));
          }
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Group by status
  const columns = useMemo(() => {
    const map: Record<ColumnId, TaskRow[]> = {
      backlog: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    for (const t of tasks) {
      const col = (t.status as ColumnId) ?? "backlog";
      if (map[col]) map[col].push(t);
    }
    // Sort each column by position
    for (const col of Object.keys(map) as ColumnId[]) {
      map[col].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [tasks]);

  // ── Drag handlers ──────────────────────────────────────────────────────
  const dragTask = useRef<string | null>(null);

  function onDragStart(e: React.DragEvent, taskId: string) {
    dragTask.current = taskId;
    e.dataTransfer.effectAllowed = "move";
    // Firefox needs this
    e.dataTransfer.setData("text/plain", taskId);
  }

  async function onDrop(e: React.DragEvent, targetStatus: string) {
    e.preventDefault();
    const taskId = dragTask.current;
    dragTask.current = null;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: targetStatus } : t,
      ),
    );

    const targetCol = columns[targetStatus as ColumnId] ?? [];
    const maxPos = targetCol.length > 0 ? Math.max(...targetCol.map((t) => t.position)) : 0;

    await moveTask(taskId, targetStatus, maxPos + 1);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  // ── Create task ────────────────────────────────────────────────────────
  async function handleCreate(status: ColumnId, title: string) {
    if (!title.trim()) return;
    const res = await createTask({ title, status });
    if (res.ok && res.id) {
      const targetCol = columns[status] ?? [];
      const maxPos = targetCol.length > 0 ? Math.max(...targetCol.map((t) => t.position)) : 0;
      setTasks((prev) => [
        ...prev,
        {
          id: res.id!,
          title: title.trim(),
          description: null,
          status,
          priority: "medium",
          assignee_id: null,
          due_date: null,
          position: maxPos + 1,
          created_by: currentUserId ?? null,
          created_at: new Date().toISOString(),
          assignee: null,
        },
      ]);
    }
  }

  async function handleDelete(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await deleteTask(taskId);
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Task Board
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            {tasks.length} tasks · {columns.done.length} completed
          </p>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
            live
              ? "border-gray-300 bg-gray-100 text-gray-700"
              : "border-gray-200 bg-gray-50 text-gray-500",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              live ? "animate-pulse bg-gray-900" : "bg-gray-400",
            )}
          />
          {live ? "Live" : "Connecting…"}
        </span>
      </div>

      {/* Kanban columns */}
      <div className="grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            column={col}
            tasks={columns[col.id] ?? []}
            members={members}
            onDragStart={onDragStart}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onCreate={(title) => handleCreate(col.id, title)}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

// ── Column ──────────────────────────────────────────────────────────────────
function Column({
  column,
  tasks,
  members,
  onDragStart,
  onDrop,
  onDragOver,
  onCreate,
  onDelete,
}: {
  column: (typeof COLUMNS)[number];
  tasks: TaskRow[];
  members: { id: string; full_name: string | null; avatar_url: string | null }[];
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onCreate: (title: string) => void;
  onDelete: (taskId: string) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCreate) inputRef.current?.focus();
  }, [showCreate]);

  async function handleSubmit() {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    await onCreate(newTitle);
    setNewTitle("");
    setCreating(false);
    setShowCreate(false);
  }

  const Icon = column.icon;

  return (
    <div
      className="flex flex-col rounded-2xl border border-gray-100 bg-gray-50/40"
      onDrop={(e) => onDrop(e, column.id)}
      onDragOver={onDragOver}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", column.color)} />
          <h3 className="text-[13px] font-semibold text-gray-800">
            {column.label}
          </h3>
          <span className="rounded-full bg-gray-200/60 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 tabular-nums">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-600"
          title={`Add task to ${column.label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Inline create */}
      {showCreate && (
        <div className="mx-3 mb-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") {
                setShowCreate(false);
                setNewTitle("");
              }
            }}
            placeholder="Task title…"
            className="w-full border-none bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={!newTitle.trim() || creating}
              className="rounded-lg bg-gray-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-gray-700 disabled:opacity-40"
            >
              {creating ? <Spinner className="h-3 w-3 animate-spin" /> : "Add"}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setNewTitle("");
              }}
              className="text-[11px] text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task cards */}
      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {tasks.length === 0 && !showCreate && (
          <p className="py-8 text-center text-[12px] text-gray-400">
            No tasks
          </p>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            members={members}
            onDragStart={onDragStart}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

// ── Task card ───────────────────────────────────────────────────────────────
function TaskCard({
  task,
  members,
  onDragStart,
  onDelete,
}: {
  task: TaskRow;
  members: { id: string; full_name: string | null; avatar_url: string | null }[];
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDelete: (taskId: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  const PriorityIcon = priority.icon;
  const assignee = members.find((m) => m.id === task.assignee_id);

  async function handleDelete() {
    setDeleting(true);
    await onDelete(task.id);
    setDeleting(false);
  }

  async function saveTitle() {
    if (editTitle.trim() && editTitle !== task.title) {
      await updateTask(task.id, { title: editTitle.trim() });
    }
    setEditing(false);
  }

  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className="group relative rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-gray-300 hover:shadow-md cursor-grab active:cursor-grabbing"
    >
      {/* Top: priority + menu */}
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PriorityIcon className={cn("h-3 w-3", priority.color)} />
          <span className={cn("text-[10px] font-medium", priority.color)}>
            {priority.label}
          </span>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded p-0.5 text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:text-gray-600"
          >
            <DotsThreeVertical className="h-3.5 w-3.5" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-6 z-20 w-32 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setEditing(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50"
                >
                  Edit title
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleDelete();
                  }}
                  disabled={deleting}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-red-500 hover:bg-red-50"
                >
                  {deleting ? <Spinner className="h-3 w-3 animate-spin" /> : <Trash className="h-3 w-3" />}
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      {editing ? (
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveTitle();
            if (e.key === "Escape") {
              setEditTitle(task.title);
              setEditing(false);
            }
          }}
          autoFocus
          className="w-full border-none bg-transparent text-[13px] font-medium text-gray-900 outline-none"
        />
      ) : (
        <p className="text-[13px] font-medium leading-snug text-gray-900">
          {task.title}
        </p>
      )}

      {/* Description preview */}
      {task.description && !editing && (
        <p className="mt-1 text-[11.5px] leading-relaxed text-gray-500 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Footer: due date + assignee */}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <span
              className={cn(
                "flex items-center gap-1 text-[10.5px]",
                isOverdue ? "font-medium text-red-500" : "text-gray-400",
              )}
            >
              <CalendarBlank className="h-3 w-3" />
              {new Date(task.due_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
        {assignee && (
          <SquircleAvatar
            name={assignee.full_name}
            src={assignee.avatar_url}
            size="xs"
            className="h-5 w-5 text-[8px]"
          />
        )}
      </div>
    </div>
  );
}
