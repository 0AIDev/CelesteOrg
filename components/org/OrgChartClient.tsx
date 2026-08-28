"use client";

import { useEffect, useMemo, useState, useCallback, memo } from "react";
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
import { saveProfileNote, summarizeProfile, reassignManager } from "@/app/actions/org-actions";
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
  allRoles = [],
  departments,
  equity,
  currentUserId,
  myNotes = {},
  initialMemberId = null,
}: {
  trees: OrgNode[];
  allRoles?: { id: string; title: string; profile_id: string; reports_to: string | null; department_id: string | null; level: number; profileName: string }[];
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
  const [localTrees, setLocalTrees] = useState<OrgNode[]>(trees);

  // Manager lookup: child profile_id -> parent profile_id
  const managerOf = useMemo(() => findManagers(localTrees), [localTrees]);
  const profileById = useMemo(() => indexProfiles(localTrees), [localTrees]);

  const treesToShow = useMemo(() => {
    if (!activeDept) return localTrees;
    return treeByDept(localTrees, activeDept);
  }, [activeDept, localTrees]);

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

  // Deep link from ⌘K
  useEffect(() => {
    if (!initialMemberId) return;
    const node = profileById.get(initialMemberId);
    if (node) openPerson(node);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMemberId]);

  // Called after a successful reassignment — rebuild the tree locally
  const handleReassign = useCallback(async (sourceRoleId: string, newManagerRoleId: string | null) => {
    const res = await reassignManager(sourceRoleId, newManagerRoleId);
    if (!res.ok) return;

    // Rebuild tree in-memory: move the source node under the new parent
    const moved = moveNodeInTree(localTrees, sourceRoleId, newManagerRoleId);
    setLocalTrees(moved);
    setSelected(null);
  }, [localTrees]);

  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 pt-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Org Chart
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Click any teammate to view their profile. Drag to reorder.
          </p>
        </div>

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

      <div className="h-[calc(100vh-12rem)] w-full overflow-hidden">
        {treesToShow.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">No one in this department yet.</p>
          </div>
        ) : (
          <OrgChartFlow
            key={filterKey}
            nodes={treesToShow}
            onSelect={openPerson}
            currentUserId={currentUserId}
            onDropNode={handleReassign}
          />
        )}
      </div>

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
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="m-4 mr-6 h-[calc(100vh-2rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:bg-[#161616] dark:border-[rgba(255,255,255,0.1)]"
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
                allRoles={allRoles}
                onReassignDone={handleReassign}
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
          ? "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors bg-white text-black border-white dark:bg-white dark:text-black dark:border-white"
          : "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors bg-white text-gray-600 border-gray-200 dark:bg-transparent dark:text-gray-400 dark:border-[rgba(255,255,255,0.1)] dark:hover:bg-[rgba(255,255,255,0.04)]"
      }
    >
      {children}
    </button>
  );
}

// ─── React Flow tree ─────────────────────────────────────────────────────────
type OrgNodeData = { node: OrgNode };

const NODE_W = 208;
const NODE_H = 152;
const H_GAP = 56;
const V_GAP = 132;

function layoutTree(roots: OrgNode[]): { nodes: Node<OrgNodeData>[]; edges: Edge[] } {
  const nodes: Node<OrgNodeData>[] = [];
  const edges: Edge[] = [];
  let nextLeafX = 0;

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

const MemoizedOrgCardNode = memo(OrgCardNode);

function OrgChartFlow({
  nodes: roots,
  onSelect,
  onDropNode,
  currentUserId,
}: {
  nodes: OrgNode[];
  onSelect: (n: OrgNode) => void;
  onDropNode: (sourceId: string, targetId: string) => void;
  currentUserId?: string | null;
}) {
  const { nodes, edges } = useMemo(() => layoutTree(roots), [roots]);

  const nodeTypes = useMemo(
    () => ({
      org: (props: NodeProps) => (
        <MemoizedOrgCardNode
          {...props}
          onSelect={onSelect}
          onDropNode={onDropNode}
          currentUserId={currentUserId}
        />
      ),
    }),
    [onSelect, onDropNode, currentUserId],
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
      nodesDraggable={!!currentUserId}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      minZoom={0.2}
      maxZoom={1}
      onNodeClick={(_, node) => {
        const data = node.data as OrgNodeData;
        onSelect(data.node);
      }}
      onNodeDragStop={(_, node) => {
        const draggedData = node.data as OrgNodeData;
        const draggedId = draggedData.node.roleId;
        for (const n of nodes) {
          if (n.id === draggedId) continue;
          const dx = Math.abs(n.position.x - node.position.x);
          const dy = Math.abs(n.position.y - node.position.y);
          if (dx < NODE_W * 0.8 && dy < NODE_H * 0.8) {
            onDropNode(draggedId, n.id);
            return;
          }
        }
      }}
      className="bg-transparent"
    >
      <Background gap={28} size={1} color="#e7e9ee" />
    </ReactFlow>
  );
}

// Memoized edge component for performance
const OrgEdge = memo(function OrgEdge({
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
      stroke="var(--edge-strong, #d7dae1)"
      strokeWidth={1.5}
      className="dark:stroke-[rgba(255,255,255,0.15)]"
    />
  );
});

// Memoized card node
function OrgCardNode({ data, onSelect }: NodeProps & { onSelect?: (n: OrgNode) => void; onDropNode?: (s: string, t: string) => void; currentUserId?: string | null }) {
  const { node } = data as OrgNodeData;
  const reportCount = countReports(node);
  return (
    <div className="group relative flex flex-col items-center">
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <button
        onClick={() => onSelect?.(node)}
        className="group relative flex w-[208px] flex-col items-center rounded-2xl border border-gray-200 bg-white px-3 pb-5 pt-0 shadow-sm transition-all hover:border-gray-300 hover:shadow-md dark:border-[rgba(255,255,255,0.1)] dark:bg-[#161616] dark:hover:border-[rgba(255,255,255,0.2)]"
      >
        <div className="relative -mt-8">
          <SquircleAvatar
            name={node.full_name}
            src={node.avatar_url}
            size="lg"
            className="h-14 w-14 text-sm"
          />
        </div>
        <p className="mt-2.5 w-full truncate text-center text-sm font-semibold text-gray-900 dark:text-white">
          {node.full_name}
        </p>
        <p className="w-full truncate text-center text-xs text-gray-500 dark:text-gray-400">
          {node.title}
        </p>
      </button>
      {reportCount > 0 && (
        <span className="absolute -bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gray-900 px-2.5 py-0.5 text-[10.5px] font-semibold text-white shadow-sm dark:bg-[rgba(255,255,255,0.15)] dark:text-white">
          {reportCount.toLocaleString()}
          <CaretDown className="h-2.5 w-2.5" />
        </span>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

function ProfilePanel({
  person,
  onClose,
  currentUserId,
  initialNote,
  allRoles = [],
  onReassignDone,
}: {
  person: PersonPanel;
  onClose: () => void;
  currentUserId?: string | null;
  initialNote?: string;
  allRoles?: { id: string; title: string; profile_id: string; reports_to: string | null; department_id: string | null; level: number; profileName: string }[];
  onReassignDone?: (sourceRoleId: string, newManagerRoleId: string | null) => void;
}) {
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [note, setNote] = useState(initialNote ?? "");
  const [noteSaved, setNoteSaved] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(true);
  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState("");
  const canSeeNotes = !!currentUserId;
  const router = useRouter();

  const canReassign = allRoles.length > 0;
  const myRole = allRoles.find((r) => r.profile_id === person.id);
  const availableManagers = allRoles.filter((r) => r.id !== myRole?.id);

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

  async function onReassign(newManagerRoleId: string) {
    if (!myRole || !canReassign) return;
    setReassigning(true);
    setReassignError("");
    // Use the callback — it calls reassignManager + rebuilds tree locally
    if (onReassignDone) {
      await onReassignDone(myRole.id, newManagerRoleId || null);
    } else {
      const res = await reassignManager(myRole.id, newManagerRoleId || null);
      if (!res.ok) setReassignError(res.error);
    }
    setReassigning(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-[rgba(255,255,255,0.06)]">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">Profile</span>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5 py-6">
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

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => router.push(`/chat?peer=${person.id}`)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            <PaperPlaneTilt className="h-4 w-4" />
            Message
          </button>
          <button
            onClick={onSummarize}
            disabled={summarizing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-medium text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 dark:border-[rgba(255,255,255,0.1)] dark:bg-transparent dark:text-gray-300 dark:hover:bg-[rgba(255,255,255,0.04)]"
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

        <div className="mt-6">
          {person.bio && (
            <Section title="About">
              <p className="text-sm leading-relaxed text-gray-600">{person.bio}</p>
            </Section>
          )}

          {person.location && (
            <Section title="Location">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" />
                {person.location}
              </div>
            </Section>
          )}

          {person.previous_companies?.length ? (
            <Section title="Previous companies">
              <p className="text-sm text-gray-600">
                {person.previous_companies.join(" · ")}
              </p>
            </Section>
          ) : null}

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

          {person.managerName && (
            <Section title="Manager">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <ArrowRight className="h-4 w-4 text-gray-400" />
                {person.managerName}
              </div>
            </Section>
          )}

          {canReassign && myRole && (
            <Section title="Reassign manager">
              <select
                value={myRole.reports_to ?? ""}
                onChange={(e) => onReassign(e.target.value)}
                disabled={reassigning}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-gray-400 dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.04)] dark:text-gray-200"
              >
                <option value="">Top level (CEO)</option>
                {availableManagers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.profileName} — {r.title}
                  </option>
                ))}
              </select>
              {reassigning && <p className="mt-1 text-[11px] text-gray-400">Updating…</p>}
              {reassignError && <p className="mt-1 text-[11px] text-red-500">{reassignError}</p>}
            </Section>
          )}

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

          {person.departmentName && (
            <Section title="Team">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4 text-gray-400" />
                {person.departmentName}
              </div>
            </Section>
          )}

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
                  className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.04)] dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-[rgba(255,255,255,0.2)] dark:focus:ring-[rgba(255,255,255,0.1)]"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={onSaveNote}
                    disabled={savingNote}
                    className="rounded-lg bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
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

// ── Helpers ─────────────────────────────────────────────────────────────────

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

/**
 * Rebuild the tree after a reassignment: extract the moved node from its old
 * parent and attach it under the new manager (or make it a root).
 */
function moveNodeInTree(
  trees: OrgNode[],
  sourceRoleId: string,
  newManagerRoleId: string | null,
): OrgNode[] {
  let movedNode: OrgNode | null = null;

  // 1. Remove the source node from its current parent
  const removeNode = (nodes: OrgNode[]): OrgNode[] =>
    nodes
      .map((n) => {
        if (n.roleId === sourceRoleId) {
          movedNode = n;
          return null; // remove from here
        }
        return { ...n, reports: removeNode(n.reports) };
      })
      .filter(Boolean) as OrgNode[];

  const cleaned = removeNode(trees);

  if (!movedNode) return trees;

  // 2. Insert under new parent (or make root)
  if (!newManagerRoleId) {
    // Make root
    return [...cleaned, movedNode];
  }

  const addNode = (nodes: OrgNode[]): OrgNode[] =>
    nodes.map((n) => {
      if (n.roleId === newManagerRoleId) {
        return { ...n, reports: [...n.reports, movedNode!] };
      }
      return { ...n, reports: addNode(n.reports) };
    });

  return addNode(cleaned);
}
