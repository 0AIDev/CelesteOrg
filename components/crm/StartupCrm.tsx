"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  X,
  Trash,
  Spinner,
  MagnifyingGlass,
  Star,
  StarHalf,
  ArrowUpRight,
  Envelope,
  PencilSimple,
  ChatCircleText,
} from "@phosphor-icons/react";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  createContact,
  updateContact,
  deleteContact,
  addFeedback,
  type ContactRow,
  type FeedbackRow,
} from "@/app/actions/crm-actions";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  lead: { label: "Lead", color: "text-gray-600", bg: "bg-gray-100" },
  beta_tester: { label: "Beta", color: "text-blue-600", bg: "bg-blue-50" },
  customer: { label: "Customer", color: "text-green-600", bg: "bg-green-50" },
  churned: { label: "Churned", color: "text-red-500", bg: "bg-red-50" },
};

const FEEDBACK_CATEGORIES = ["general", "bug", "feature_request", "nps", "onboarding", "pricing"];

// ── Main component ──────────────────────────────────────────────────────────
export function StartupCrm({
  initialContacts = [],
}: {
  initialContacts?: ContactRow[];
}) {
  const [contacts, setContacts] = useState<ContactRow[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<ContactRow | null>(null);
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

  async function handleCreate(data: { name: string; email: string; company: string; role: string; status: string }) {
    const res = await createContact(data);
    if (res.ok && res.id) {
      setContacts((prev) => [
        { id: res.id!, ...data, email: data.email || null, company: data.company || null, role: data.role || null, source: "manual", notes: null, created_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), feedback_count: 0, avg_rating: null },
        ...prev,
      ]);
      setShowCreate(false);
    }
  }

  async function handleUpdate(id: string, fields: { status?: string; notes?: string | null }) {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));
    setEditing(null);
    await updateContact(id, fields);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await deleteContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setDeleting(null);
  }

  async function handleAddFeedback(data: { contact_id: string; rating: number; category: string; content: string }) {
    const res = await addFeedback(data);
    if (res.ok) {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === data.contact_id
            ? { ...c, feedback_count: (c.feedback_count ?? 0) + 1 }
            : c,
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
            {contacts.length} contacts · {pipeline.customer} customers · {pipeline.lead} leads
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-gray-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add contact
        </button>
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

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-4 py-2.5 font-medium text-gray-500">Name</th>
                <th className="px-4 py-2.5 font-medium text-gray-500">Company</th>
                <th className="px-4 py-2.5 font-medium text-gray-500">Status</th>
                <th className="px-4 py-2.5 font-medium text-gray-500">Rating</th>
                <th className="px-4 py-2.5 font-medium text-gray-500">Feedback</th>
                <th className="px-4 py-2.5 font-medium text-gray-500">Added</th>
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
                  return (
                    <tr key={c.id} className="group transition-colors hover:bg-gray-50/50">
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
                        {c.role && (
                          <span className="block text-[11px] text-gray-400">{c.role}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn("capitalize", status.color, status.bg)}>
                          {status.label}
                        </Badge>
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
                        <span className="tabular-nums text-gray-500">{c.feedback_count ?? 0}</span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => setFeedbackFor(c)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            title="Add feedback"
                          >
                            <ChatCircleText className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditing(c)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            title="Edit"
                          >
                            <PencilSimple className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={deleting === c.id}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            title="Delete"
                          >
                            {deleting === c.id ? (
                              <Spinner className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash className="h-3.5 w-3.5" />
                            )}
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

      {/* Modals */}
      {showCreate && (
        <ContactModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      )}
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
    </div>
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
          {/* Star rating */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-500">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className="rounded p-0.5"
                >
                  <Star
                    className={cn(
                      "h-5 w-5 transition-colors",
                      n <= rating ? "text-amber-400" : "text-gray-200",
                    )}
                    weight="fill"
                  />
                </button>
              ))}
            </div>
          </div>
          {/* Category */}
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
          {/* Content */}
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
