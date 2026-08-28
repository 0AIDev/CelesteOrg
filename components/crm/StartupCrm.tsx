"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  X,
  Trash,
  Spinner,
  MagnifyingGlass,
  Star,
  ArrowUpRight,
  Envelope,
  PencilSimple,
  ChatCircleText,
  List,
  RowsPlusBottom,
  UserCircle,
  CurrencyDollar,
  CalendarBlank,
  ArrowRight,
  CaretDown,
  NotePencil,
  ClockCounterClockwise,
  Phone,
  Globe,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Badge } from "@/components/ui/Badge";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { cn } from "@/lib/utils";
import {
  createContact,
  updateContact,
  updateContactFull,
  moveContact,
  deleteContact,
  addFeedback,
  getContactActivities,
  type ContactRow,
  type FeedbackRow,
  type ActivityRow,
} from "@/app/actions/crm-actions";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof UserCircle }> = {
  lead: { label: "Lead", color: "text-gray-600", bg: "bg-gray-100", icon: UserCircle },
  beta_tester: { label: "Beta", color: "text-blue-600", bg: "bg-blue-50", icon: ArrowUpRight },
  customer: { label: "Customer", color: "text-green-600", bg: "bg-green-50", icon: Star },
  churned: { label: "Churned", color: "text-red-500", bg: "bg-red-50", icon: X },
};

const DEAL_STAGES = [
  { value: "none", label: "No Deal" },
  { value: "discovery", label: "Discovery" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

const FEEDBACK_CATEGORIES = ["general", "bug", "feature_request", "nps", "onboarding", "pricing"];

const ACTIVITY_ICONS: Record<string, typeof ClockCounterClockwise> = {
  status_change: ArrowRight,
  deal_update: CurrencyDollar,
  feedback: ChatCircleText,
  note: NotePencil,
  created: Plus,
  default: ClockCounterClockwise,
};

// ── Main component ──────────────────────────────────────────────────────────
export function StartupCrm({
  initialContacts = [],
}: {
  initialContacts?: ContactRow[];
}) {
  const [contacts, setContacts] = useState<ContactRow[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<ContactRow | null>(null);
  const [detailContact, setDetailContact] = useState<ContactRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = contacts;
    if (statusFilter) list = list.filter((c) => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [contacts, search, statusFilter]);

  const pipeline = useMemo(() => {
    const counts: Record<string, number> = { lead: 0, beta_tester: 0, customer: 0, churned: 0 };
    for (const c of contacts) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return counts;
  }, [contacts]);

  const totalDealValue = useMemo(() => {
    return contacts.reduce((s, c) => s + (c.deal_value ?? 0), 0);
  }, [contacts]);

  async function handleCreate(data: { name: string; email: string; company: string; role: string; status: string }) {
    const res = await createContact(data);
    if (res.ok && res.id) {
      setContacts((prev) => [
        {
          id: res.id!, ...data, email: data.email || null, company: data.company || null,
          role: data.role || null, source: "manual", notes: null, created_by: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          feedback_count: 0, avg_rating: null, deal_value: null, deal_stage: "none", deal_close_date: null,
        },
        ...prev,
      ]);
      setShowCreate(false);
    }
  }

  async function handleUpdate(id: string, fields: Partial<ContactRow>) {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));
    setEditing(null);
    setDetailContact(null);
    await updateContactFull(id, {
      status: fields.status,
      notes: fields.notes,
      deal_value: fields.deal_value,
      deal_stage: fields.deal_stage,
      deal_close_date: fields.deal_close_date,
    });
  }

  async function handleMoveContact(id: string, newStatus: string) {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    await moveContact(id, newStatus);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await deleteContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setDeleting(null);
    setDetailContact(null);
  }

  async function handleAddFeedback(data: { contact_id: string; rating: number; category: string; content: string }) {
    const res = await addFeedback(data);
    if (res.ok) {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === data.contact_id ? { ...c, feedback_count: (c.feedback_count ?? 0) + 1 } : c,
        ),
      );
      setFeedbackFor(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            CRM Pipeline
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            {contacts.length} contacts · {pipeline.customer} customers · {totalDealValue > 0 ? `$${totalDealValue.toLocaleString()} pipeline` : "No deals"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
            <button
              onClick={() => setView("kanban")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                view === "kanban" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700",
              )}
            >
              <RowsPlusBottom className="h-3.5 w-3.5" />
              Pipeline
            </button>
            <button
              onClick={() => setView("table")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                view === "table" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700",
              )}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </button>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-gray-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add contact
          </button>
        </div>
      </div>

      {/* Pipeline counters */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? null : key)}
            className={cn(
              "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
              statusFilter === key
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white hover:border-gray-300",
            )}
          >
            <span
              className={cn(
                "text-[13px] font-medium",
                statusFilter === key ? "text-white" : "text-gray-700",
              )}
            >
              {cfg.label}
            </span>
            <span
              className={cn(
                "text-xl font-bold tabular-nums",
                statusFilter === key ? "text-white" : "text-gray-900",
              )}
            >
              {pipeline[key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts by name, email, or company…"
          className="input h-9 w-full pl-9 text-[13px]"
        />
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="grid gap-4 lg:grid-cols-4">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const colContacts = filtered.filter((c) => c.status === key);
            const Icon = cfg.icon;
            return (
              <KanbanColumn
                key={key}
                status={key}
                label={cfg.label}
                color={cfg.color}
                icon={Icon}
                contacts={colContacts}
                onMoveContact={handleMoveContact}
                onSelectContact={setDetailContact}
                onEditContact={setEditing}
                onDeleteContact={handleDelete}
                deleting={deleting}
              />
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === "table" && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-2.5 font-medium text-gray-500">Name</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500">Company</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500">Deal Stage</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500">Value</th>
                  <th className="px-4 py-2.5 font-medium text-gray-500">Rating</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                      No contacts found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const status = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.lead;
                    const dealStage = DEAL_STAGES.find((d) => d.value === c.deal_stage) ?? DEAL_STAGES[0];
                    return (
                      <tr key={c.id} className="group transition-colors hover:bg-gray-50/50 cursor-pointer" onClick={() => setDetailContact(c)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <SquircleAvatar name={c.name} size="xs" className="h-7 w-7 text-[10px]" />
                            <div>
                              <p className="font-medium text-gray-900">{c.name}</p>
                              {c.email && (
                                <p className="flex items-center gap-1 text-[11px] text-gray-400">
                                  <Envelope className="h-3 w-3" />
                                  {c.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-600">{c.company || "—"}</span>
                          {c.role && <span className="block text-[11px] text-gray-400">{c.role}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn("capitalize", status.color, status.bg)}>{status.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-500">{dealStage.label}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-700 tabular-nums">
                          {c.deal_value ? `$${c.deal_value.toLocaleString()}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {c.avg_rating != null ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 text-amber-400" weight="fill" />
                              <span className="tabular-nums text-gray-700">{c.avg_rating.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={(e) => { e.stopPropagation(); setFeedbackFor(c); }}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              title="Add feedback"
                            >
                              <ChatCircleText className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditing(c); }}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              title="Edit"
                            >
                              <PencilSimple className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                              disabled={deleting === c.id}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                              title="Delete"
                            >
                              {deleting === c.id ? <Spinner className="h-3.5 w-3.5 animate-spin" /> : <Trash className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && <ContactModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
      {editing && (
        <EditModal
          contact={editing}
          onClose={() => setEditing(null)}
          onSave={(fields) => handleUpdate(editing.id, fields)}
        />
      )}
      {feedbackFor && (
        <FeedbackModal
          contact={feedbackFor}
          onClose={() => setFeedbackFor(null)}
          onSubmit={handleAddFeedback}
        />
      )}

      {/* Contact detail slide-over */}
      <AnimatePresence>
        {detailContact && (
          <ContactDetailPanel
            contact={detailContact}
            onClose={() => setDetailContact(null)}
            onEdit={() => { setEditing(detailContact); setDetailContact(null); }}
            onDelete={() => { handleDelete(detailContact.id); }}
            onAddFeedback={() => { setFeedbackFor(detailContact); setDetailContact(null); }}
            onStatusChange={(newStatus) => handleMoveContact(detailContact.id, newStatus)}
            onSaveDeal={(fields) => handleUpdate(detailContact.id, fields)}
            allContacts={contacts}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Kanban Column ───────────────────────────────────────────────────────────
function KanbanColumn({
  status,
  label,
  color,
  icon: Icon,
  contacts,
  onMoveContact,
  onSelectContact,
  onEditContact,
  onDeleteContact,
  deleting,
}: {
  status: string;
  label: string;
  color: string;
  icon: typeof UserCircle;
  contacts: ContactRow[];
  onMoveContact: (id: string, status: string) => void;
  onSelectContact: (c: ContactRow) => void;
  onEditContact: (c: ContactRow) => void;
  onDeleteContact: (id: string) => void;
  deleting: string | null;
}) {
  const [dragOver, setDragOver] = useState(false);

  function onDragStart(e: React.DragEvent, contactId: string) {
    e.dataTransfer.setData("text/plain", contactId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const contactId = e.dataTransfer.getData("text/plain");
    if (contactId) onMoveContact(contactId, status);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
    e.dataTransfer.dropEffect = "move";
  }

  function onDragLeave() {
    setDragOver(false);
  }

  const totalValue = contacts.reduce((s, c) => s + (c.deal_value ?? 0), 0);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border transition-colors",
        dragOver ? "border-gray-400 bg-gray-50" : "border-gray-100 bg-gray-50/40",
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", color)} />
          <h3 className="text-[13px] font-semibold text-gray-800">{label}</h3>
          <span className="rounded-full bg-gray-200/60 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 tabular-nums">
            {contacts.length}
          </span>
        </div>
        {totalValue > 0 && (
          <span className="text-[10px] font-medium text-gray-400 tabular-nums">
            ${totalValue.toLocaleString()}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3 max-h-[calc(100vh-20rem)]">
        {contacts.length === 0 && (
          <p className="py-8 text-center text-[12px] text-gray-400">No contacts</p>
        )}
        {contacts.map((c) => (
          <KanbanCard
            key={c.id}
            contact={c}
            onDragStart={onDragStart}
            onSelect={() => onSelectContact(c)}
            onEdit={() => onEditContact(c)}
            onDelete={() => onDeleteContact(c.id)}
            deleting={deleting === c.id}
          />
        ))}
      </div>
    </div>
  );
}

// ── Kanban Card ─────────────────────────────────────────────────────────────
function KanbanCard({
  contact,
  onDragStart,
  onSelect,
  onEdit,
  onDelete,
  deleting,
}: {
  contact: ContactRow;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const dealStage = DEAL_STAGES.find((d) => d.value === contact.deal_stage);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, contact.id)}
      className="group relative rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-gray-300 hover:shadow-md cursor-grab active:cursor-grabbing"
    >
      {/* Menu */}
      <div className="absolute right-2 top-2">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="rounded p-0.5 text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:text-gray-600"
        >
          <CaretDown className="h-3 w-3" />
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-5 z-20 w-36 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              <button onClick={() => { setShowMenu(false); onSelect(); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50">
                View details
              </button>
              <button onClick={() => { setShowMenu(false); onEdit(); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50">
                Edit
              </button>
              <div className="border-t border-gray-100">
                <button onClick={() => { setShowMenu(false); onDelete(); }} disabled={deleting} className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-red-500 hover:bg-red-50">
                  {deleting ? <Spinner className="h-3 w-3 animate-spin" /> : <Trash className="h-3 w-3" />}
                  Delete
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div onClick={onSelect} className="cursor-pointer">
        <div className="flex items-center gap-2.5 mb-2">
          <SquircleAvatar name={contact.name} size="xs" className="h-7 w-7 text-[10px]" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-gray-900">{contact.name}</p>
            {contact.company && <p className="truncate text-[11px] text-gray-400">{contact.company}</p>}
          </div>
        </div>

        {/* Deal info */}
        {contact.deal_value && contact.deal_value > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-md bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600 tabular-nums">
              ${contact.deal_value.toLocaleString()}
            </span>
            {dealStage && dealStage.value !== "none" && (
              <span className="text-[10px] text-gray-400">{dealStage.label}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {contact.feedback_count != null && contact.feedback_count > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <ChatCircleText className="h-3 w-3" />
                {contact.feedback_count}
              </span>
            )}
            {contact.email && (
              <span className="text-[10px] text-gray-300">
                <Envelope className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Contact Detail Panel ────────────────────────────────────────────────────
function ContactDetailPanel({
  contact,
  onClose,
  onEdit,
  onDelete,
  onAddFeedback,
  onStatusChange,
  onSaveDeal,
  allContacts,
}: {
  contact: ContactRow;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddFeedback: () => void;
  onStatusChange: (status: string) => void;
  onSaveDeal: (fields: Partial<ContactRow>) => void;
  allContacts: ContactRow[];
}) {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [dealValue, setDealValue] = useState(String(contact.deal_value ?? ""));
  const [dealStage, setDealStage] = useState(contact.deal_stage ?? "none");
  const [dealCloseDate, setDealCloseDate] = useState(contact.deal_close_date ?? "");
  const [savingDeal, setSavingDeal] = useState(false);
  const [dealSaved, setDealSaved] = useState(false);

  useEffect(() => {
    setLoadingActivities(true);
    getContactActivities(contact.id).then((res) => {
      if (res.ok && res.activities) setActivities(res.activities);
      setLoadingActivities(false);
    });
  }, [contact.id]);

  const status = STATUS_CONFIG[contact.status] ?? STATUS_CONFIG.lead;
  const dealStageConfig = DEAL_STAGES.find((d) => d.value === dealStage) ?? DEAL_STAGES[0];

  async function handleSaveDeal() {
    setSavingDeal(true);
    await onSaveDeal({
      deal_value: dealValue ? Number(dealValue) : null,
      deal_stage: dealStage,
      deal_close_date: dealCloseDate || null,
    });
    setSavingDeal(false);
    setDealSaved(true);
    setTimeout(() => setDealSaved(false), 2000);
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end bg-black/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="m-4 mr-6 h-[calc(100vh-2rem)] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/90 backdrop-blur-sm px-5 py-3">
          <span className="text-sm font-semibold text-gray-900">Contact Details</span>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-6">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <SquircleAvatar name={contact.name} size="xl" className="h-16 w-16 text-lg" />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">{contact.name}</h2>
              <p className="text-sm text-gray-500">{contact.role ?? "No role"}</p>
              <Badge className={cn("mt-1 capitalize", status.color, status.bg)}>{status.label}</Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex gap-2">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-gray-700"
              >
                <Envelope className="h-4 w-4" />
                Email
              </a>
            )}
            <button
              onClick={onAddFeedback}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-medium text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <ChatCircleText className="h-4 w-4" />
              Feedback
            </button>
          </div>

          {/* Quick info */}
          <div className="mt-6 space-y-3">
            {contact.email && (
              <div className="flex items-center gap-2 text-[13px] text-gray-600">
                <Envelope className="h-4 w-4 text-gray-400 shrink-0" />
                {contact.email}
              </div>
            )}
            {contact.company && (
              <div className="flex items-center gap-2 text-[13px] text-gray-600">
                <Globe className="h-4 w-4 text-gray-400 shrink-0" />
                {contact.company}
              </div>
            )}
            {contact.source && (
              <div className="flex items-center gap-2 text-[13px] text-gray-600">
                <ArrowUpRight className="h-4 w-4 text-gray-400 shrink-0" />
                Source: {contact.source}
              </div>
            )}
          </div>

          {/* Status selector */}
          <div className="mt-6">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</div>
            <div className="flex gap-1.5">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => onStatusChange(key)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                    contact.status === key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                  )}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deal Tracking */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <CurrencyDollar className="h-3.5 w-3.5" />
              Deal Tracking
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] text-gray-500">Deal Value ($)</label>
                <input
                  type="number"
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value)}
                  placeholder="0"
                  className="input h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-gray-500">Deal Stage</label>
                <CustomSelect
                  value={dealStage}
                  onValueChange={setDealStage}
                  placeholder="Select stage"
                  options={DEAL_STAGES.map((d) => ({ value: d.value, label: d.label }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-gray-500">Expected Close Date</label>
                <input
                  type="date"
                  value={dealCloseDate}
                  onChange={(e) => setDealCloseDate(e.target.value)}
                  className="input h-8 text-[13px]"
                />
              </div>
              <button
                onClick={handleSaveDeal}
                disabled={savingDeal}
                className="w-full rounded-lg bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {savingDeal ? <Spinner className="h-3 w-3 animate-spin" /> : dealSaved ? "Saved ✓" : "Save Deal"}
              </button>
            </div>
          </div>

          {/* Notes */}
          {contact.notes && (
            <div className="mt-6">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Notes</div>
              <p className="text-[13px] leading-relaxed text-gray-600">{contact.notes}</p>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <ClockCounterClockwise className="h-3.5 w-3.5" />
              Activity Timeline
            </div>
            {loadingActivities ? (
              <div className="flex items-center gap-2 py-4 text-[12px] text-gray-400">
                <Spinner className="h-3 w-3 animate-spin" />
                Loading activities…
              </div>
            ) : activities.length === 0 ? (
              <p className="py-4 text-[12px] text-gray-400">No activity recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {activities.map((a) => {
                  const Icon = ACTIVITY_ICONS[a.type] ?? ACTIVITY_ICONS.default;
                  return (
                    <div key={a.id} className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
                        <Icon className="h-3 w-3 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] text-gray-700">{a.description}</p>
                        <p className="text-[10px] text-gray-400">
                          {a.author?.full_name ?? "System"} · {new Date(a.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="mt-8 border-t border-gray-100 pt-4">
            <button
              onClick={onDelete}
              className="flex items-center gap-2 text-[12px] text-red-500 hover:text-red-600"
            >
              <Trash className="h-3.5 w-3.5" />
              Delete contact
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Create modal ────────────────────────────────────────────────────────────
function ContactModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: { name: string; email: string; company: string; role: string; status: string }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("lead");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-gray-900">New contact</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="input h-9 text-[13px]" autoFocus />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="input h-9 text-[13px]" />
          <div className="grid grid-cols-2 gap-3">
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className="input h-9 text-[13px]" />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (optional)" className="input h-9 text-[13px]" />
          </div>
          <div className="flex gap-1.5">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatus(key)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  status === key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                )}
              >
                {cfg.label}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-[12px] font-medium text-gray-400 hover:text-gray-700">Cancel</button>
            <button
              onClick={() => name.trim() && onSubmit({ name, email, company, role, status })}
              disabled={!name.trim()}
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-gray-700 disabled:opacity-40"
            >
              Add contact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit modal ──────────────────────────────────────────────────────────────
function EditModal({
  contact,
  onClose,
  onSave,
}: {
  contact: ContactRow;
  onClose: () => void;
  onSave: (fields: Partial<ContactRow>) => void;
}) {
  const [status, setStatus] = useState(contact.status);
  const [notes, setNotes] = useState(contact.notes ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-gray-900">Edit {contact.name}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-500">Status</label>
            <div className="flex gap-1.5">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatus(key)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                    status === key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                  )}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-500">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
              placeholder="Internal notes about this contact…"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-[12px] font-medium text-gray-400 hover:text-gray-700">Cancel</button>
            <button
              onClick={() => onSave({ status, notes: notes || null })}
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-gray-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feedback modal ──────────────────────────────────────────────────────────
function FeedbackModal({
  contact,
  onClose,
  onSubmit,
}: {
  contact: ContactRow;
  onClose: () => void;
  onSubmit: (data: { contact_id: string; rating: number; category: string; content: string }) => void;
}) {
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState("general");
  const [content, setContent] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-gray-900">
            Feedback for {contact.name}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-500">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className="rounded p-0.5">
                  <Star
                    className={cn("h-5 w-5 transition-colors", n <= rating ? "text-amber-400" : "text-gray-200")}
                    weight="fill"
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-500">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {FEEDBACK_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                    category === cat ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                  )}
                >
                  {cat.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
            placeholder="What did they say? Any direct quotes…"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-[12px] font-medium text-gray-400 hover:text-gray-700">Cancel</button>
            <button
              onClick={() => content.trim() && onSubmit({ contact_id: contact.id, rating, category, content })}
              disabled={!content.trim()}
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-gray-700 disabled:opacity-40"
            >
              Save feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
