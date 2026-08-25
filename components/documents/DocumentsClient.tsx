"use client";

import { useMemo, useState } from "react";
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
  Bell,
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
} from "@/app/actions/document-actions";
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

type SigRequest = {
  id: string;
  document_id: string;
  status: string;
  requested_at: string;
  signed_at: string | null;
  signer: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

export function DocumentsClient({
  docs,
  mine,
  members,
  requests,
}: {
  docs: Doc[];
  mine: string | null;
  members: Member[];
  requests: SigRequest[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "grid">(() =>
    typeof window !== "undefined" && window.localStorage.getItem("celeste-docs-view") === "grid" ? "grid" : "list",
  );
  const [tab, setTab] = useState<"all" | "tosign">("all");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Doc | null>(null);
  const [signingDoc, setSigningDoc] = useState<Doc | null>(null);
  const [sendingDoc, setSendingDoc] = useState<Doc | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [member, setMember] = useState("");

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

  const myPendingDocIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of requests) {
      if (r.status === "pending" && r.signer?.id === mine) set.add(r.document_id);
    }
    return set;
  }, [requests, mine]);

  const filtered = docs.filter((d) => {
    if (tab === "tosign" && !myPendingDocIds.has(d.id)) return false;
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
        alert(prep.error);
        setUploading(false);
        return;
      }
      if (!prep.path) {
        alert("Could not allocate an upload path.");
        setUploading(false);
        return;
      }
      // Upload the bytes to the signed upload URL from the same origin as Supabase.
      // The storage API requires content-type + x-upsert on this endpoint.
      const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const url = `${apiUrl}/storage/v1/object/upload/${prep.path}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "true",
        },
        body: file,
      });
      if (!res.ok) {
        alert(`Upload failed (${res.status})`);
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
      if (!record.ok) alert(record.error);
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

  function statusText(d: Doc): { label: string; awaitingMine: boolean } {
    const reqs = reqByDoc.get(d.id) ?? [];
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
          <div className="grid grid-cols-[2fr_1.2fr_1fr_0.7fr_0.8fr] gap-3 bg-gray-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            <span>Name</span>
            <span>Owner</span>
            <span>Category</span>
            <span>Size</span>
            <span className="text-right">Date</span>
          </div>
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-gray-400">
              No documents found.
            </div>
          )}
          {filtered.map((d) => {
            const st = statusText(d);
            return (
              <button
                key={d.id}
                onClick={() => openPreview(d)}
                className="grid w-full grid-cols-[2fr_1.2fr_1fr_0.7fr_0.8fr] items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50"
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
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => {
            const st = statusText(d);
            return (
              <button key={d.id} onClick={() => openPreview(d)} className="card card-hover text-left">
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
              </button>
            );
          })}
        </div>
      )}

      {/* Preview modal */}      {preview && (
        <PreviewModal
          doc={preview}
          mine={mine}
          reqs={reqByDoc.get(preview.id) ?? []}
          previewUrl={previewUrl}
          onClose={() => setPreview(null)}
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
    </div>
  );
}

function PreviewModal({
  doc,
  mine,
  reqs,
  previewUrl,
  onClose,
  onSign,
  onSend,
}: {
  doc: Doc;
  mine: string | null;
  reqs: SigRequest[];
  previewUrl: string | null;
  onClose: () => void;
  onSign: () => void;
  onSend: () => void;
}) {
  const isOwner = doc.owner?.id === mine;
  const pending = reqs.filter((r) => r.status === "pending");
  const signed = reqs.filter((r) => r.status === "signed");
  const [reminding, setReminding] = useState(false);
  const [remindMsg, setRemindMsg] = useState("");

  async function revoke(id: string) {
    const res = await revokeSignatureRequest({ requestId: id });
    if (!res.ok) alert(res.error);
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

  return (
    <Modal onClose={onClose} title="Document preview">
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-900">{doc.title}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
          <span>{fmtBytes(doc.file_size)}</span>
          <span>·</span>
          <span>Owner: {doc.owner?.full_name}</span>
        </div>
      </div>
      <div
        className={`flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-200 bg-gray-50 ${
          doc.mime_type === "application/pdf" ? "h-96" : "h-64"
        }`}
      >
        {previewUrl ? (
          doc.mime_type === "application/pdf" ? (
            <iframe
              src={previewUrl}
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
                    <span className="flex items-center gap-1 text-[11px] font-medium text-gray-700">
                      <Check className="h-3 w-3" />
                      Signed {r.signed_at ? relativeTime(r.signed_at) : ""}
                    </span>
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

      <div className="mt-4 flex justify-end gap-2">
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
        className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-2xl backdrop-blur-xl animate-fade-in"
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
