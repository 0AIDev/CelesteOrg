"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Checkbox from "@radix-ui/react-checkbox";
import {
  SquaresFour,
  List,
  UploadSimple,
  FileText,
  File,
  Spinner,
  X,
  PenNib,
  ShieldCheck,
  Check,
  MagnifyingGlass,
  PaperPlaneTilt,
  ArrowCounterClockwise,
  Download,
  Bell,
  Trash,
  PencilSimple,
  FolderSimple,
} from "@phosphor-icons/react";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Badge } from "@/components/ui/Badge";
import { FileUpload } from "@/components/ui/FileUpload";
import { FilterBar } from "@/components/ui/FilterBar";
import type { DateRange } from "@/components/ui/DateRangePicker";
import {
  createUploadUrl,
  createDocumentRecord,
  getDocumentSignedUrl,
  deleteDocument,
  updateDocument,
} from "@/app/actions/document-actions";
import { getCurrentUserProfile, type UserProfile } from "@/app/actions/nda-actions";
import {
  signDocument,
  sendForSignature,
  revokeSignatureRequest,
  sendRemindersNow,
} from "@/app/actions/signature-actions";
import { fmtBytes, relativeTime } from "@/lib/utils";

type Doc = {
  id: string;
  title: string;
  category: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_at: string;
  requires_signature: boolean;
  owner: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

type Member = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role_title: string | null;
};

type Signature = {
  id: string;
  document_id: string;
  signer_id: string;
  typed_name: string;
  signature_hash: string | null;
  signed_at: string;
  signer: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

type SigRequest = {
  id: string;
  document_id: string;
  status: string;
  requested_at: string;
  signed_at: string | null;
  signer: { id: string; full_name: string | null; avatar_url: string | null } | null;
  signature: {
    id: string;
    typed_name: string | null;
    signature_hash: string | null;
    signed_at: string | null;
  } | null;
};

export function DocumentsClient({
  docs,
  mine,
  members,
  requests,
  canDelete,
  signatures,
  initialDocId = null,
}: {
  docs: Doc[];
  mine: string | null;
  members: Member[];
  requests: SigRequest[];
  canDelete: boolean;
  signatures: Signature[];
  initialDocId?: string | null;
}) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "grid">(() =>
    typeof window !== "undefined" && window.localStorage.getItem("celeste-docs-view") === "grid" ? "grid" : "list",
  );
  const [tab, setTab] = useState<"all" | "tosign" | "signed">("all");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Doc | null>(null);
  const [signingDoc, setSigningDoc] = useState<Doc | null>(null);
  const [sendingDoc, setSendingDoc] = useState<Doc | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [member, setMember] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Doc | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const CATEGORIES = ["General", "Legal", "HR", "Finance", "Engineering", "Marketing", "Operations", "Strategy"];

  async function handleRename(docId: string) {
    const updates: { title?: string; category?: string } = {};
    if (editTitle.trim()) updates.title = editTitle.trim();
    if (editCategory) updates.category = editCategory;
    if (Object.keys(updates).length === 0) { setEditingDocId(null); return; }
    const res = await updateDocument(docId, updates);
    setEditingDocId(null);
    if (res.ok) router.refresh();
  }

  async function handleDelete(d: Doc) {
    if (deletingId) return;
    setDeletingId(d.id);
    const res = await deleteDocument(d.id);
    setDeletingId(null);
    setConfirmDelete(null);
    if (!res.ok) {
      return;
    }
    router.refresh();
  }

  const ownerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of docs) {
      if (d.owner?.full_name) map.set(d.owner.id, d.owner.full_name);
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [docs]);

  const reqByDoc = useMemo(() => {
    const map = new Map<string, SigRequest[]>();
    for (const r of requests) {
      const arr = map.get(r.document_id) ?? [];
      arr.push(r);
      map.set(r.document_id, arr);
    }
    return map;
  }, [requests]);

  // Real captured signatures per document (direct signatures + request ones).
  const sigByDoc = useMemo(() => {
    const map = new Map<string, Signature[]>();
    for (const s of signatures) {
      const arr = map.get(s.document_id) ?? [];
      arr.push(s);
      map.set(s.document_id, arr);
    }
    return map;
  }, [signatures]);

  const myPendingDocIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of requests) {
      if (r.status === "pending" && r.signer?.id === mine) set.add(r.document_id);
    }
    return set;
  }, [requests, mine]);

  // Signed = has at least one real captured signature, or every request is
  // signed. Direct signatures (no request row) count too.
  const signedDocIds = useMemo(() => {
    const set = new Set<string>();
    for (const d of docs) {
      if ((sigByDoc.get(d.id) ?? []).length > 0) {
        set.add(d.id);
        continue;
      }
      const reqs = reqByDoc.get(d.id) ?? [];
      if (reqs.length > 0 && reqs.every((r) => r.status === "signed")) set.add(d.id);
    }
    return set;
  }, [docs, sigByDoc, reqByDoc]);

  const filtered = docs.filter((d) => {
    if (tab === "tosign" && !myPendingDocIds.has(d.id)) return false;
    if (tab === "signed" && !signedDocIds.has(d.id)) return false;
    if (!d.title.toLowerCase().includes(query.toLowerCase())) return false;
    if (range.start && range.end) {
      const dt = d.uploaded_at.slice(0, 10);
      if (dt < range.start || dt > range.end) return false;
    }
    if (member && d.owner?.id !== member) return false;
    return true;
  });

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const title = file.name.replace(/\.[^.]+$/, "");
      const prep = await createUploadUrl({
        title,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        requiresSignature: true,
      });
      if (!prep.ok) {
        setToast(prep.error);
        setTimeout(() => setToast(null), 3000);
        setUploading(false);
        return;
      }
      if (!prep.signedUrl) {
        setToast("Could not allocate an upload path.");
        setTimeout(() => setToast(null), 3000);
        setUploading(false);
        return;
      }
      // Upload the bytes to the signed upload URL returned by Supabase.
      // It already contains the /sign/{bucket}/{path}?token=... contract that
      // the storage API requires (matching storage-js uploadToSignedUrl),
      // plus content-type and x-upsert headers.
      const res = await fetch(prep.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "true",
        },
        body: file,
      });
      if (!res.ok) {
        setToast(`Upload failed (${res.status})`);
        setTimeout(() => setToast(null), 3000);
        setUploading(false);
        return;
      }
      const record = await createDocumentRecord({
        title,
        category: "General",
        requires_signature: true,
        file_path: prep.path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || undefined,
      });
      if (!record.ok) {
        setToast(record.error);
        setTimeout(() => setToast(null), 3000);
      }
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function openPreview(doc: Doc) {
    setPreview(doc);
    setPreviewUrl(null);
    const url = await getDocumentSignedUrl(doc.id, "view", 60);
    if (url.ok && url.url) setPreviewUrl(url.url);
  }

  // Deep link from ⌘K — open the requested document's preview on arrival.
  useEffect(() => {
    if (!initialDocId) return;
    const doc = docs.find((d) => d.id === initialDocId);
    if (doc) void openPreview(doc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDocId]);

  function statusText(d: Doc): { label: string; awaitingMine: boolean } {
    const sigs = sigByDoc.get(d.id) ?? [];
    const reqs = reqByDoc.get(d.id) ?? [];
    // A real signature is the strongest signal — the document is signed.
    if (sigs.length > 0) {
      return {
        label: sigs.length === 1 ? "signed" : `signed by ${sigs.length}`,
        awaitingMine: false,
      };
    }
    if (reqs.length === 0) return { label: "requires signature", awaitingMine: false };
    const pending = reqs.filter((r) => r.status === "pending");
    const minePending = pending.some((r) => r.signer?.id === mine);
    if (pending.length === 0) return { label: "fully signed", awaitingMine: false };
    if (minePending && d.owner?.id !== mine) return { label: "awaiting your signature", awaitingMine: true };
    return { label: `awaiting ${pending.length}/${reqs.length} signatures`, awaitingMine: false };
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Documents
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Private company documents with cryptographic e-signature.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docs…"
              className="input w-52 pl-9"
            />
          </div>
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            <button
              onClick={() => {
                setView("list");
                try { window.localStorage.setItem("celeste-docs-view", "list"); } catch { /* ignore */ }
              }}
              className={`rounded-md p-1.5 ${view === "list" ? "bg-gray-100 text-gray-900" : "text-gray-400"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setView("grid");
                try { window.localStorage.setItem("celeste-docs-view", "grid"); } catch { /* ignore */ }
              }}
              className={`rounded-md p-1.5 ${view === "grid" ? "bg-gray-100 text-gray-900" : "text-gray-400"}`}
            >
              <SquaresFour className="h-4 w-4" />
            </button>
          </div>
          <FileUpload onFile={handleFile} disabled={uploading}>
            {(open) => (
              <button
                onClick={open}
                disabled={uploading}
                className="btn-primary"
              >
                {uploading ? <Spinner className="h-4 w-4 animate-spin" /> : <UploadSimple className="h-4 w-4" />}
                Upload
              </button>
            )}
          </FileUpload>
        </div>
      </div>

      {/* Tabs — All vs To sign */}
      <div className="mb-4 flex items-center gap-1 border-b border-gray-100">
        <button
          onClick={() => setTab("all")}
          className={`border-b-2 px-3 pb-2 text-sm font-medium transition-colors ${
            tab === "all"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          All documents
        </button>
        <button
          onClick={() => setTab("tosign")}
          className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-medium transition-colors ${
            tab === "tosign"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <PenNib className="h-3.5 w-3.5" />
          To sign
          {myPendingDocIds.size > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-semibold text-white">
              {myPendingDocIds.size}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("signed")}
          className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-medium transition-colors ${
            tab === "signed"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <Check className="h-3.5 w-3.5" />
          Signed
          {signedDocIds.size > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-semibold text-white">
              {signedDocIds.size}
            </span>
          )}
        </button>
      </div>

      <div className="mb-4">
        <FilterBar
          range={range}
          onRangeChange={setRange}
          members={ownerOptions}
          memberValue={member}
          onMemberChange={setMember}
        />
      </div>
      {member || range.start ? (
        <p className="mb-3 text-xs text-gray-500">
          Showing {filtered.length} of {docs.length} documents.
        </p>
      ) : null}

      {view === "list" ? (
        <div className="card divide-y divide-gray-100 overflow-hidden">
          <div className="grid grid-cols-[2fr_1.2fr_1fr_0.7fr_0.8fr_0.3fr] gap-3 bg-gray-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            <span>Name</span>
            <span>Owner</span>
            <span>Category</span>
            <span>Size</span>
            <span className="text-right">Date</span>
            <span />  {/* delete column */}
          </div>
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-gray-400">
              No documents found.
            </div>
          )}
          {filtered.map((d) => {
            const st = statusText(d);
            const canRemoveRow = canDelete || d.owner?.id === mine;
            return (
              <div
                key={d.id}
                onClick={() => openPreview(d)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openPreview(d); }}
                className="grid w-full grid-cols-[2fr_1.2fr_1fr_0.7fr_0.8fr_0.3fr] items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{d.title}</p>
                    <div className="flex items-center gap-2">
                      {d.requires_signature && (
                        <span
                          className={`flex items-center gap-0.5 text-[11px] font-medium ${
                            st.awaitingMine ? "text-gray-900" : "text-gray-500"
                          }`}
                        >
                          <PenNib className="h-3 w-3" />
                          {st.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <SquircleAvatar name={d.owner?.full_name} src={d.owner?.avatar_url} size="xs" />
                  <span className="truncate">{d.owner?.full_name}</span>
                </div>
                <div>
                  <Badge tone="neutral">{d.category ?? "General"}</Badge>
                </div>
                <span className="text-sm text-gray-500">{fmtBytes(d.file_size)}</span>
                <span className="text-right text-sm text-gray-400">{relativeTime(d.uploaded_at)}</span>
                <div className="flex justify-end">
                  {canRemoveRow && (
                    <div className="flex items-center gap-1 opacity-0 transition-all [div:hover>&]:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDocId(d.id);
                          setEditTitle(d.title);
                          setEditCategory(d.category ?? "General");
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-600"
                        title="Rename / change category"
                      >
                        <PencilSimple className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(d); }}
                        disabled={deletingId === d.id}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-red-500 disabled:opacity-40"
                        title="Delete document"
                      >
                        {deletingId === d.id ? (
                          <Spinner className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => {
            const st = statusText(d);
            const canRemoveRow = canDelete || d.owner?.id === mine;
            return (
              <div
                key={d.id}
                role="button"
                tabIndex={0}
                onClick={() => openPreview(d)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openPreview(d); }}
                className="card card-hover group/card relative cursor-pointer text-left"
              >
                {canRemoveRow && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(d); }}
                    disabled={deletingId === d.id}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover/card:opacity-100 disabled:opacity-40"
                    title="Delete document"
                  >
                    {deletingId === d.id ? (
                      <Spinner className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
                <File className="h-5 w-5 text-gray-400" />
                <p className="mt-3 truncate text-sm font-semibold text-gray-900">{d.title}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {fmtBytes(d.file_size)} · {relativeTime(d.uploaded_at)}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <Badge tone="neutral">{d.category ?? "General"}</Badge>
                  {d.requires_signature && (
                    <span
                      className={`flex items-center gap-0.5 text-[11px] font-medium ${
                        st.awaitingMine ? "text-gray-900" : "text-gray-500"
                      }`}
                    >
                      <PenNib className="h-3 w-3" />
                      {st.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview modal */}      {preview && (
        <PreviewModal
          doc={preview}
          mine={mine}
          reqs={reqByDoc.get(preview.id) ?? []}
          signatures={sigByDoc.get(preview.id) ?? []}
          previewUrl={previewUrl}
          canDelete={canDelete}
          onClose={() => setPreview(null)}
          onDeleted={() => {
            setPreview(null);
            router.refresh();
          }}
          onSign={() => {
            setSigningDoc(preview);
            setPreview(null);
          }}
          onSend={() => {
            setSendingDoc(preview);
            setPreview(null);
          }}
        />
      )}

      {/* E-signature modal */}
      {signingDoc && (
        <SignModal
          doc={signingDoc}
          onClose={() => setSigningDoc(null)}
          onDone={() => {
            setSigningDoc(null);
            router.refresh();
          }}
        />
      )}

      {/* Send-for-signature modal */}
      {sendingDoc && (
        <SendForSignatureModal
          doc={sendingDoc}
          mine={mine}
          members={members}
          existing={reqByDoc.get(sendingDoc.id) ?? []}
          onClose={() => setSendingDoc(null)}
          onDone={() => {
            setSendingDoc(null);
            router.refresh();
          }}
        />
      )}

      {/* Custom delete confirm modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm animate-fade-in rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-semibold text-gray-900">Delete document</h4>
            <p className="mt-1.5 text-[13px] text-gray-500">
              Delete &ldquo;{confirmDelete.title}&rdquo; permanently? This cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="text-sm font-medium text-gray-400 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete(confirmDelete)}
                disabled={!!deletingId}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId ? <Spinner className="h-3.5 w-3.5 animate-spin" /> : <Trash className="h-3.5 w-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast for upload errors */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-700 shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* Rename / Category modal */}
      {editingDocId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setEditingDocId(null)}
        >
          <div
            className="w-full max-w-sm animate-fade-in rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-semibold text-gray-900">Rename document</h4>
            <label className="mt-3 mb-1 block text-[12px] text-gray-500">Title</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="input w-full"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(editingDocId); }}
            />
            <label className="mt-3 mb-1 block text-[12px] text-gray-500">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setEditCategory(c)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    editCategory === c
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingDocId(null)}
                className="text-[13px] font-medium text-gray-400 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRename(editingDocId)}
                disabled={!editTitle.trim()}
                className="btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewModal({
  doc,
  mine,
  reqs,
  signatures,
  previewUrl,
  canDelete,
  onClose,
  onDeleted,
  onSign,
  onSend,
}: {
  doc: Doc;
  mine: string | null;
  reqs: SigRequest[];
  signatures: Signature[];
  previewUrl: string | null;
  canDelete: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onSign: () => void;
  onSend: () => void;
}) {
  const isOwner = doc.owner?.id === mine;
  const canRemove = isOwner || canDelete;
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mdContent, setMdContent] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(null);
  const isNDA = doc.title?.toLowerCase().includes("nda");

  // Fetch markdown content for .md files
  useEffect(() => {
    if (!previewUrl || doc.mime_type !== "text/markdown") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(previewUrl);
        if (!cancelled && res.ok) {
          setMdContent(await res.text());
        }
      } catch {
        // ignore — fallback to previewUrl
      }
    })();
    return () => { cancelled = true; };
  }, [previewUrl, doc.mime_type]);

  // Fetch user profile for NDA personalization
  useEffect(() => {
    if (!isNDA) return;
    let cancelled = false;
    (async () => {
      const profile = await getCurrentUserProfile();
      if (!cancelled) setUserProfile(profile);
    })();
    return () => { cancelled = true; };
  }, [isNDA]);

  // Personalize NDA content with user data
  const personalizedContent = useMemo(() => {
    if (!mdContent || !isNDA || !userProfile) return mdContent;
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    return mdContent
      .replace(/______________________/g, (match, offset) => {
        // First set of blanks = Authorized Party section (after "AUTHORIZED PARTY")
        const before = mdContent.slice(0, offset);
        const authPartyIdx = before.lastIndexOf("### AUTHORIZED PARTY");
        const companyIdx = before.lastIndexOf("### COMPANY");
        if (authPartyIdx > companyIdx) {
          // In Authorized Party section
          const linesBefore = before.slice(authPartyIdx).split("\n");
          const lastLabel = linesBefore.reverse().find(l => l.includes("|"));
          if (lastLabel?.includes("Signature")) return "________________________________________";
          if (lastLabel?.includes("Printed Name")) return `  ${userProfile.full_name ?? ""}  `;
          if (lastLabel?.includes("Date")) return `  ${today}  `;
        }
        // Default: empty blank
        return match;
      })
      .replace(/Field \| Details\n\|---\|---\n\| \*\*Full Legal Name\*\* \| _+/, 
        `Field | Details\n|---|---\n| **Full Legal Name** | ${userProfile.full_name ?? ""}`)
      .replace(/\| \*\*Role \/ Position\*\* \| _+/, 
        `| **Role / Position** | ${userProfile.role_title ?? ""}`)
      .replace(/\| \*\*Department\*\* \| _+/, 
        `| **Department** | ${userProfile.department_name ?? ""}`)
      .replace(/\| \*\*Date of Execution\*\* \| _+/, 
        `| **Date of Execution** | ${today}`);
  }, [mdContent, isNDA, userProfile]);

  async function remove() {
    setDeleting(true);
    const res = await deleteDocument(doc.id);
    setDeleting(false);
    setShowConfirm(false);
    if (!res.ok) return;
    onDeleted();
  }
  const pending = reqs.filter((r) => r.status === "pending");
  const signed = reqs.filter((r) => r.status === "signed");
  const [reminding, setReminding] = useState(false);
  const [remindMsg, setRemindMsg] = useState("");

  async function revoke(id: string) {
    const res = await revokeSignatureRequest({ requestId: id });
    window.location.reload();
  }

  async function remind() {
    setReminding(true);
    setRemindMsg("");
    const res = await sendRemindersNow({ documentId: doc.id });
    setReminding(false);
    if (!res.ok) {
      setRemindMsg(res.error);
      return;
    }
    setRemindMsg(
      res.reminded && res.reminded > 0
        ? `Reminder sent to ${res.reminded} pending signer${res.reminded === 1 ? "" : "s"}`
        : "No pending signers to remind.",
    );
  }

  const displayContent = isNDA ? personalizedContent : mdContent;

  function downloadNDA() {
    if (!displayContent) return;
    const blob = new Blob([displayContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title.replace(/[^\w\s-]/g, "").trim() || "NDA"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Modal onClose={onClose} title="Document preview">
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-900">{doc.title}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
          <span>{fmtBytes(doc.file_size)}</span>
          <span>·</span>
          <span>Owner: {doc.owner?.full_name}</span>
          {isNDA && userProfile && (
            <>
              <span>·</span>
              <span className="text-blue-500">Personalized for {userProfile.full_name}</span>
            </>
          )}
        </div>
        {isNDA && displayContent && (
          <button
            onClick={downloadNDA}
            className="mt-2 flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <Download className="h-3.5 w-3.5" />
            Download NDA
          </button>
        )}
      </div>
      <div
        className={`overflow-hidden rounded-xl border border-dashed border-gray-200 bg-gray-50 ${
          doc.mime_type === "application/pdf" ? "h-96" : "h-64"
        }`}
      >
        {displayContent ? (
          <div className="h-full overflow-y-auto p-6 prose prose-sm prose-gray max-w-none dark:prose-invert">
            {displayContent.split("\n").map((line, i) => {
              if (line.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold mt-0 mb-4">{line.slice(2)}</h1>;
              if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-semibold mt-6 mb-3">{line.slice(3)}</h2>;
              if (line.startsWith("### ")) return <h3 key={i} className="text-lg font-semibold mt-5 mb-2">{line.slice(4)}</h3>;
              if (line.startsWith("---")) return <hr key={i} className="my-4 border-gray-200" />;
              if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold mt-3">{line.slice(2, -2)}</p>;
              if (line.startsWith("- **")) {
                const parts = line.slice(2).split("**");
                return <p key={i} className="ml-4"><strong>{parts[1]}</strong>{parts[2]}</p>;
              }
              if (line.startsWith("- ")) return <p key={i} className="ml-4">• {line.slice(2)}</p>;
              if (line.startsWith("| ")) {
                const cells = line.split("|").filter(Boolean).map(c => c.trim());
                if (cells.every(c => c.match(/^-+$/))) return null;
                return <div key={i} className="grid grid-cols-2 gap-2 py-1 text-sm"><span className="font-medium text-gray-600">{cells[0]}</span><span>{cells[1]}</span></div>;
              }
              if (line.match(/^\d+\. /)) return <p key={i} className="ml-4">{line}</p>;
              if (line.trim() === "") return <div key={i} className="h-2" />;
              return <p key={i} className="text-sm leading-relaxed">{line}</p>;
            })}
          </div>
        ) : previewUrl ? (
          doc.mime_type === "application/pdf" ? (
            <iframe
              src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
              title={doc.title}
              className="h-full w-full"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={doc.title}
              className="h-full w-full object-contain"
            />
          )
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <FileText className="h-10 w-10" />
            <span className="text-sm">Preview unavailable in-browser</span>
          </div>
        )}
      </div>

      {/* Real captured signatures — typed names rendered in handwriting */}
      {signatures.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Signatures ({signatures.length})
          </p>
          <div className="mt-2 space-y-3 rounded-xl border border-gray-100 bg-gray-50/40 p-3">
            {signatures.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <SquircleAvatar name={s.signer?.full_name} src={s.signer?.avatar_url} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="font-signature truncate text-xl leading-none text-gray-900">
                    {s.typed_name}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[10.5px] text-gray-400">
                    <Check className="h-3 w-3 shrink-0" />
                    {s.signer?.full_name ?? "Signer"}
                    <span>·</span>
                    {s.signed_at ? relativeTime(s.signed_at) : ""}
                    {s.signature_hash ? (
                      <span className="font-mono">· {s.signature_hash.slice(0, 10)}…</span>
                    ) : null}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {doc.requires_signature && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Signature requests {reqs.length > 0 && `(${signed.length}/${reqs.length} signed)`}
            </p>
            {isOwner && (
              <div className="flex items-center gap-1.5">
                {pending.length > 0 && (
                  <button
                    onClick={remind}
                    disabled={reminding}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    title="Send a reminder to everyone who hasn't signed yet"
                  >
                    {reminding ? <Spinner className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                    Remind
                  </button>
                )}
                <button
                  onClick={onSend}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  <PaperPlaneTilt className="h-3.5 w-3.5" />
                  {reqs.length === 0 ? "Send for signature" : "Request more"}
                </button>
              </div>
            )}
          </div>
          {remindMsg && <p className="mt-2 text-xs text-gray-500">{remindMsg}</p>}
          {reqs.length === 0 ? (
            <p className="mt-2 text-xs text-gray-400">
              {isOwner
                ? "No one has been asked to sign yet — send it to specific teammates."
                : "No signature requests for you on this document."}
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-100">
              {reqs.map((r) => (
                <li key={r.id} className="flex items-center gap-2.5 py-2">
                  <SquircleAvatar name={r.signer?.full_name} src={r.signer?.avatar_url} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                    {r.signer?.full_name ?? "Unknown"}
                  </span>
                  {r.status === "pending" && (
                    <>
                      <span className="text-[11px] font-medium text-gray-500">Pending</span>
                      {isOwner && (
                        <button
                          onClick={() => revoke(r.id)}
                          title="Revoke request"
                          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        >
                          <ArrowCounterClockwise className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                  {r.status === "signed" && (
                    <div className="flex flex-col items-end gap-0.5">
                      {/* The real signature — the signer's typed name, rendered
                          in handwriting, exactly as it was captured. */}
                      <span className="font-signature max-w-[10rem] truncate text-xl leading-none text-gray-900">
                        {r.signature?.typed_name ?? r.signer?.full_name ?? "Signed"}
                      </span>
                      <span className="flex items-center gap-1 text-[10.5px] text-gray-400">
                        <Check className="h-3 w-3" />
                        Signed {r.signed_at ? relativeTime(r.signed_at) : ""}
                        {r.signature?.signature_hash
                          ? ` · ${r.signature.signature_hash.slice(0, 10)}…`
                          : ""}
                      </span>
                    </div>
                  )}
                  {r.status === "revoked" && (
                    <span className="text-[11px] font-medium text-gray-400">Revoked</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        {canRemove ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            {deleting ? <Spinner className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
            Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
          {doc.requires_signature && (
            <button
              onClick={onSign}
              className="btn-primary"
              disabled={pending.length === 0 && reqs.length > 0}
              title={
                pending.length === 0 && reqs.length > 0
                  ? "All requested signers have already signed"
                  : undefined
              }
            >
              <PenNib className="h-4 w-4" />
              Sign Document
            </button>
          )}
        </div>
      </div>

      {/* Custom delete confirm modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-sm animate-fade-in rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-semibold text-gray-900">Delete document</h4>
            <p className="mt-1.5 text-[13px] text-gray-500">
              Delete &ldquo;{doc.title}&rdquo; permanently? This cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="text-sm font-medium text-gray-400 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={remove}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? <Spinner className="h-3.5 w-3.5 animate-spin" /> : <Trash className="h-3.5 w-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function SendForSignatureModal({
  doc,
  mine,
  members,
  existing,
  onClose,
  onDone,
}: {
  doc: Doc;
  mine: string | null;
  members: Member[];
  existing: SigRequest[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [ids, setIds] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const alreadyRequested = useMemo(() => {
    const set = new Set<string>();
    for (const r of existing) {
      if (r.status !== "revoked" && r.signer?.id) set.add(r.signer.id);
    }
    return set;
  }, [existing]);

  const available = members.filter((m) => m.id !== mine);

  function toggle(id: string) {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function send() {
    if (ids.length === 0) return;
    setBusy(true);
    setErr("");
    const res = await sendForSignature({
      documentId: doc.id,
      signerIds: ids,
      message: msg.trim() ? msg.trim() : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    onDone();
  }

  return (
    <Modal onClose={onClose} title="Send for signature">
      <p className="mb-4 text-sm text-gray-600">
        Ask teammates to sign <span className="font-medium text-gray-900">{doc.title}</span>.
        They&apos;ll get a notification and can sign from their Documents page.
      </p>

      <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Who needs to sign?</label>
      {available.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400">
          No other team members yet — invite them first.
        </p>
      ) : (
        <ul className="max-h-56 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200">
          {available.map((m) => {
            const done = alreadyRequested.has(m.id);
            return (
              <li key={m.id}>
                <label
                  className={`flex items-center gap-2.5 px-3 py-2 ${
                    done ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-gray-50"
                  }`}
                >
                  <Checkbox.Root
                    checked={ids.includes(m.id) || done}
                    disabled={done}
                    onCheckedChange={() => !done && toggle(m.id)}
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-300 bg-white"
                  >
                    <Checkbox.Indicator>
                      <Check className="h-3 w-3 text-white" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <SquircleAvatar name={m.full_name} src={m.avatar_url} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{m.full_name}</span>
                  <span className="truncate text-xs text-gray-400">{m.role_title}</span>
                  {done && <span className="text-[11px] font-medium text-gray-400">already asked</span>}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <label className="mt-4 mb-1.5 block text-[13px] font-medium text-gray-700">
        Message <span className="font-normal text-gray-400">(optional)</span>
      </label>
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="e.g. Please review and sign by Friday."
        rows={2}
        className="input resize-none"
      />

      {err && <p className="mt-3 text-xs text-gray-600">{err}</p>}

      <div className="mt-5 flex items-center justify-between gap-2">
        <button onClick={onClose} className="px-2 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
          Cancel
        </button>
        <button
          onClick={send}
          disabled={ids.length === 0 || busy}
          className="btn-primary disabled:opacity-50"
        >
          {busy ? <Spinner className="h-4 w-4 animate-spin" /> : <PaperPlaneTilt className="h-4 w-4" />}
          Send to {ids.length === 0 ? "signature" : `${ids.length} ${ids.length === 1 ? "person" : "people"}`}
        </button>
      </div>
    </Modal>
  );
}

function SignModal({
  doc,
  onClose,
  onDone,
}: {
  doc: Doc;
  onClose: () => void;
  onDone: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const [signing, setSigning] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function sign() {
    setSigning(true);
    const res = await signDocument({ documentId: doc.id, typedName: name });
    setSigning(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setHash(res.hash ?? null);
  }

  if (hash) {
    return (
      <Modal onClose={onClose} title="Signed">
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-900">
            <Check className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Document signed successfully</p>
          <p className="mt-1 text-xs text-gray-400">
            Signed as <span className="font-medium italic">{name}</span>
          </p>
          <div className="mt-4 w-full rounded-lg bg-gray-50 px-3 py-2 font-mono text-[11px] break-all text-gray-500">
            sha256: {hash}
          </div>
          <button onClick={onClose} className="btn-primary mt-5">
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title="Electronically sign">
      <p className="mb-4 text-sm text-gray-600">
        By signing <span className="font-medium text-gray-900">{doc.title}</span> you agree
        to the terms described in this document. This signature is bound to your identity,
        timestamp, IP, and device, and stored immutably.
      </p>

      <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Type your full name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Maya Chen"
        className="input"
        autoFocus
      />

      <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-gray-700">
        <Checkbox.Root
          checked={agreed}
          onCheckedChange={(v) => setAgreed(Boolean(v))}
          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-300 bg-white"
        >
          <Checkbox.Indicator>
            <Check className="h-3 w-3 text-white" />
          </Checkbox.Indicator>
        </Checkbox.Root>
        <span>
          I agree to the terms and certify this is my electronic signature.
        </span>
      </label>

      {err && <p className="mt-3 text-xs text-gray-600">{err}</p>}

      <div className="mt-5 flex items-center justify-between gap-2">
        <button onClick={onClose} className="px-2 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
          Cancel
        </button>
        <button
          onClick={sign}
          disabled={!agreed || name.trim().length < 2 || signing}
          className="btn-primary disabled:opacity-50"
        >
          {signing ? <Spinner className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Sign Document
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
