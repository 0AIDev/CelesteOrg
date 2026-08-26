"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  ArrowRight,
  Users,
  NotePencil,
  Spinner,
  CaretDown,
  CaretUp,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Badge } from "@/components/ui/Badge";
import { saveProfileNote, summarizeProfile } from "@/app/actions/org-actions";
import type { OrgNode } from "@/lib/types";

type Dept = {
  id: string;
  name: string;
  color: string | null;
  headcount: number;
};

type PersonPanel = OrgNode & {
  managerName?: string;
  reportsTitles: string[];
  vestedPct?: number;
  cliffLabel?: string;
  departmentName?: string | null;
  directReportCount: number;
};

export function OrgChartClient({
  trees,
  departments,
  equity,
  currentUserId,
  myNotes = {},
  initialMemberId = null,
}: {
  trees: OrgNode[];
  departments: Dept[];
  equity: {
    byUser: Record<
      string,
      {
        total_shares: number;
        vested_shares: number;
        unvested_shares: number;
        vesting_start: string;
        cliff_months: number;
      }
    >;
  };
  currentUserId?: string | null;
  myNotes?: Record<string, string>;
  initialMemberId?: string | null;
}) {
  const [activeDept, setActiveDept] = useState<string | null>(null);
  const [selected, setSelected] = useState<PersonPanel | null>(null);

  // Manager lookup: child profile_id -> parent profile_id
  const managerOf = useMemo(() => findManagers(trees), [trees]);
  const profileById = useMemo(() => indexProfiles(trees), [trees]);

  const treesToShow = useMemo(() => {
    if (!activeDept) return trees;
    return treeByDept(trees, activeDept);
  }, [activeDept, trees]);

  // Remount the flow whenever the filter changes so it re-fits and centers
  // on the filtered tree (React Flow only fits on init).
  const filterKey = activeDept ?? "all";

  function openPerson(node: OrgNode) {
    const managerId = managerOf.get(node.id);
    const grant = equity.byUser[node.id];
    const obj: PersonPanel = {
      ...node,
      managerName: managerId && profileById.has(managerId)
        ? profileById.get(managerId)!.full_name
        : undefined,
      reportsTitles: node.reports.map((r) => `${r.title} · ${r.full_name}`),
      vestedPct:
        grant && grant.total_shares > 0
          ? Math.min(Math.round((grant.vested_shares / grant.total_shares) * 100), 100)
          : undefined,
      cliffLabel:
        grant && grant.cliff_months ? `${grant.cliff_months}-mo cliff` : undefined,
      departmentName:
        node.departmentName ?? departments.find((d) => d.id === node.department_id)?.name ?? null,
      directReportCount: countReports(node),
    };
    setSelected(obj);
  }

  // Deep link from ⌘K ("member" search result) — open that person's panel.
  useEffect(() => {
    if (!initialMemberId) return;
    const node = profileById.get(initialMemberId);
    if (node) openPerson(node);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMemberId]);

  return (
    <div>
      {/* Header + filters stay in the readable column */}
      <div className="mx-auto max-w-6xl px-6 pt-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Org Chart
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Click any teammate to view their profile, equity, and team structure.
          </p>
        </div>

        {/* Department tabs */}
        <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1">
          <DeptTab active={!activeDept} onClick={() => setActiveDept(null)}>
            All
          </DeptTab>
          {departments.map((d) => (
            <DeptTab
              key={d.id}
              active={activeDept === d.id}
              onClick={() => setActiveDept(activeDept === d.id ? null : d.id)}
            >
              {d.name}
            </DeptTab>
          ))}
        </div>
      </div>

      {/* Tree — full page, centered, everything visible (React Flow fits on mount) */}
      <div className="h-[calc(100vh-12rem)] w-full overflow-hidden">
        {treesToShow.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">
              No one in this department yet.
            </p>
          </div>
        ) : (
          <OrgChartFlow
            key={filterKey}
            nodes={treesToShow}
            onSelect={openPerson}
          />
        )}
      </div>

      {/* Slide-over profile panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="panel"
            className="fixed inset-0 z-50 flex justify-end bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            {/* Solid white card, rounded corners — same style as Ask Celeste */}
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="m-4 mr-6 h-[calc(100vh-2rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <ProfilePanel
                person={selected}
                onClose={() => setSelected(null)}
                currentUserId={currentUserId}
                initialNote={myNotes[selected.id] ?? ""}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeptTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "pill pill-active"
          : "pill bg-white"
      }
    >
      {children}
    </button>
  );
}

// ─── React Flow tree ─────────────────────────────────────────────────────────
type OrgNodeData = { node: OrgNode };

// Top-down tree layout (like theorg): parents sit above their children,
// centered over the children's horizontal span, so every subtree stays
// aligned under its manager.
const NODE_W = 208;
const NODE_H = 152;
const H_GAP = 56;
const V_GAP = 132;

function layoutTree(roots: OrgNode[]): { nodes: Node<OrgNodeData>[]; edges: Edge[] } {
  const nodes: Node<OrgNodeData>[] = [];
  const edges: Edge[] = [];
  let nextLeafX = 0;

  // Returns the node's x position. Leaves are placed on a global horizontal
  // grid; parents are centered over their children's span.
  const place = (n: OrgNode, depth: number, parentId?: string): number => {
    let x: number;
    if (n.reports.length === 0) {
      x = nextLeafX * (NODE_W + H_GAP);
      nextLeafX += 1;
    } else {
      const childXs = n.reports.map((c) => place(c, depth + 1, n.roleId));
      x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    }
    nodes.push({
      id: n.roleId,
      type: "org",
      position: { x, y: depth * (NODE_H + V_GAP) },
      data: { node: n },
      draggable: false,
    });
    if (parentId) {
      edges.push({
        id: `${parentId}->${n.roleId}`,
        source: parentId,
        target: n.roleId,
        type: "orgEdge",
        animated: false,
      });
    }
    return x;
  };

  for (const r of roots) place(r, 0);
  return { nodes, edges };
}

function OrgChartFlow({
  nodes: roots,
  onSelect,
}: {
  nodes: OrgNode[];
  onSelect: (n: OrgNode) => void;
}) {
  const { nodes, edges } = useMemo(() => layoutTree(roots), [roots]);

  const nodeTypes = useMemo(
    () => ({ org: (props: NodeProps) => <OrgCardNode {...props} onSelect={onSelect} /> }),
    [onSelect],
  );
  const edgeTypes: EdgeTypes = useMemo(() => ({ orgEdge: OrgEdge }), []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll
      // Users can't zoom (wheel/pinch/double-click off), but fitView may still
      // scale the tree down so every node is visible and centered on mount.
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      minZoom={0.2}
      maxZoom={1}
      onNodeClick={(_, node) => {
        const data = node.data as OrgNodeData;
        onSelect(data.node);
      }}
      className="bg-transparent"
    >
      <Background gap={28} size={1} color="#e7e9ee" />
    </ReactFlow>
  );
}

// Vertical connection: leaves the parent's bottom, curves down to the
// child's top — the classic top-down org tree elbow.
function OrgEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  id,
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  id: string;
}) {
  const dy = (targetY - sourceY) / 2;
  return (
    <path
      id={id}
      d={`M ${sourceX} ${sourceY} C ${sourceX} ${sourceY + dy}, ${targetX} ${targetY - dy}, ${targetX} ${targetY}`}
      fill="none"
      stroke="#d7dae1"
      strokeWidth={1.5}
    />
  );
}

// Vertical card (like theorg): circular avatar on top, name, role, and the
// direct-report count badge hanging below the bottom edge.
function OrgCardNode({ data, onSelect }: NodeProps & { onSelect?: (n: OrgNode) => void }) {
  const { node } = data as OrgNodeData;
  const reportCount = countReports(node);
  return (
    <div className="group relative flex flex-col items-center">
      {/* Target handle on top — invisible, lets the edge dock at the card's top */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <button
        onClick={() => onSelect?.(node)}
        className="group relative flex w-[208px] flex-col items-center rounded-2xl border border-gray-200 bg-white px-3 pb-5 pt-0 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
      >
        {/* Avatar overlaps the card's top edge — half in, half out */}
        <div className="relative -mt-8">
          <SquircleAvatar
            name={node.full_name}
            src={node.avatar_url}
            size="lg"
            className="h-14 w-14 text-sm"
          />
        </div>
        <p className="mt-2.5 w-full truncate text-center text-sm font-semibold text-gray-900">
          {node.full_name}
        </p>
        <p className="w-full truncate text-center text-xs text-gray-500">
          {node.title}
        </p>
      </button>
      {/* Direct-report count badge, hanging below the card */}
      {reportCount > 0 && (
        <span className="absolute -bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gray-900 px-2.5 py-0.5 text-[10.5px] font-semibold text-white shadow-sm">
          {reportCount.toLocaleString()}
          <CaretDown className="h-2.5 w-2.5" />
        </span>
      )}
      {/* Source handle on the bottom — the edge leaves from here */}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

function ProfilePanel({
  person,
  onClose,
  currentUserId,
  initialNote,
}: {
  person: PersonPanel;
  onClose: () => void;
  currentUserId?: string | null;
  initialNote?: string;
}) {
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [note, setNote] = useState(initialNote ?? "");
  const [noteSaved, setNoteSaved] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(true);
  const canSeeNotes = !!currentUserId;
  const router = useRouter();

  async function onSummarize() {
    setSummarizing(true);
    const res = await summarizeProfile(person.id, person.full_name);
    setSummarizing(false);
    if (res.ok) setSummary(res.summary);
  }

  async function onSaveNote() {
    if (!canSeeNotes) return;
    setSavingNote(true);
    const res = await saveProfileNote(person.id, note);
    setSavingNote(false);
    if (res.ok) {
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <span className="text-sm font-semibold text-gray-900">Profile</span>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5 py-6">
        {/* Identity */}
        <div className="flex items-center gap-4">
          <SquircleAvatar
            name={person.full_name}
            src={person.avatar_url}
            size="xl"
            className="h-16 w-16 text-lg"
          />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">
              {person.full_name}
            </h2>
            <p className="text-sm text-gray-500">{person.title}</p>
            {person.departmentName && (
              <Badge tone="neutral" className="mt-1">
                {person.departmentName}
              </Badge>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => router.push(`/chat?peer=${person.id}`)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-gray-700"
          >
            <PaperPlaneTilt className="h-4 w-4" />
            Message
          </button>
          <button
            onClick={onSummarize}
            disabled={summarizing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-medium text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
          {summarizing ? (
            <Spinner className="h-4 w-4 animate-spin" />
          ) : (
            <svg
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-[18px] w-[18px] shrink-0"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              style={{ strokeWidth: 1.5 }}
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.563 2.813h-5.25a2.25 2.25 0 0 0-2.25 2.25v6.375a2.25 2.25 0 0 0 2.25 2.25h2.176a.75.75 0 0 1 .482.175l1.548 1.298a.75.75 0 0 0 .96.003l1.575-1.304a.75.75 0 0 1 .478-.172h2.156a2.25 2.25 0 0 0 2.25-2.25v-2.25"
              />
              <path
                fill="currentColor"
                d="m15.18 3.139-.522-1.359a.437.437 0 0 0-.816 0l-.522 1.359a.75.75 0 0 1-.431.43l-1.359.523a.437.437 0 0 0 0 .816l1.359.522a.75.75 0 0 1 .43.431l.523 1.359a.437.437 0 0 0 .816 0l.522-1.359a.75.75 0 0 1 .431-.43l1.359-.523a.437.437 0 0 0 0-.816l-1.359-.522a.75.75 0 0 1-.43-.431"
              />
            </svg>
          )}
          Summarize with AI
          </button>
        </div>
        {summary && (
          <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
            {summary}
          </p>
        )}

        <div className="mt-6 divide-y divide-gray-100">
          {/* Bio / description */}
          {person.bio && (
            <Section title="About">
              <p className="text-sm leading-relaxed text-gray-600">{person.bio}</p>
            </Section>
          )}

          {/* Location */}
          {person.location && (
            <Section title="Location">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" />
                {person.location}
              </div>
            </Section>
          )}

          {/* Previous companies */}
          {person.previous_companies?.length ? (
            <Section title="Previous companies">
              <p className="text-sm text-gray-600">
                {person.previous_companies.join(" · ")}
              </p>
            </Section>
          ) : null}

          {/* Equity vested (existing) */}
          {person.vestedPct != null && (
            <Section title="Equity vested">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900">
                  {person.vestedPct}%
                </span>
                <span className="text-xs text-gray-400">
                  {person.cliffLabel ?? "vesting"}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  className="h-full rounded-full bg-gray-900"
                  initial={{ width: 0 }}
                  animate={{ width: `${person.vestedPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </Section>
          )}

          {/* Manager */}
          {person.managerName && (
            <Section title="Manager">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <ArrowRight className="h-4 w-4 text-gray-400" />
                {person.managerName}
              </div>
            </Section>
          )}

          {/* Org chart below — direct reports */}
          {person.reports.length > 0 && (
            <div className="py-5">
              <button
                onClick={() => setReportsOpen((o) => !o)}
                className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-400"
              >
                <span>Org chart · {person.reports.length} direct reports</span>
                {reportsOpen ? (
                  <CaretUp className="h-3.5 w-3.5" />
                ) : (
                  <CaretDown className="h-3.5 w-3.5" />
                )}
              </button>
              {reportsOpen && (
                <div className="mt-3 space-y-2">
                  {person.reports.map((r) => (
                    <div key={r.roleId} className="flex items-center gap-2.5 py-0.5">
                      <SquircleAvatar
                        name={r.full_name}
                        src={r.avatar_url}
                        size="xs"
                        className="h-7 w-7 text-[10px]"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-gray-900">
                          {r.full_name}
                        </p>
                        <p className="truncate text-[11px] text-gray-400">{r.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Team */}
          {person.departmentName && (
            <Section title="Team">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4 text-gray-400" />
                {person.departmentName}
              </div>
            </Section>
          )}

          {/* Private notes — only the author can see/edit these */}
          <div className="py-5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <NotePencil className="h-3.5 w-3.5" />
              Notes (private)
            </div>
            {canSeeNotes ? (
              <>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Only you can see these notes…"
                  className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={onSaveNote}
                    disabled={savingNote}
                    className="rounded-lg bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
                  >
                    {savingNote ? (
                      <Spinner className="h-3 w-3 animate-spin" />
                    ) : (
                      "Save note"
                    )}
                  </button>
                  {noteSaved && (
                    <span className="text-[11px] text-gray-500">Saved</span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[12.5px] text-gray-400">
                Sign in to keep private notes about your teammates.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-5">
      {title && (
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

// Helpers --------------------------------------------------------------
function countReports(node: OrgNode): number {
  let total = 0;
  const walk = (n: OrgNode) => {
    total += n.reports.length;
    for (const c of n.reports) walk(c);
  };
  walk(node);
  return total;
}

function findManagers(trees: OrgNode[]): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (node: OrgNode, parentId?: string) => {
    if (parentId) map.set(node.id, parentId);
    for (const child of node.reports) walk(child, node.id);
  };
  for (const t of trees) walk(t, undefined);
  return map;
}

function indexProfiles(trees: OrgNode[]): Map<string, OrgNode> {
  const map = new Map<string, OrgNode>();
  const walk = (node: OrgNode) => {
    map.set(node.id, node);
    for (const child of node.reports) walk(child);
  };
  for (const t of trees) walk(t);
  return map;
}

function treeByDept(
  trees: OrgNode[],
  deptId: string,
): OrgNode[] {
  // Return only branches containing at least one person in the dept.
  const clone = (node: OrgNode): OrgNode => {
    const children = node.reports
      .map(clone)
      .filter(Boolean) as OrgNode[];
    const inDept = node.department_id === deptId;
    const descendants = children.length > 0;
    if (!inDept && !descendants) return { ...node, reports: [] } as OrgNode & { reports: OrgNode[] };
    return { ...node, reports: children };
  };
  return trees.map(clone).filter((t) => t.reports.length > 0 || t.department_id === deptId);
}
