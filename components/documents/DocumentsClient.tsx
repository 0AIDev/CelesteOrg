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
import { signDocument } from "@/app/actions/signature-actions";
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

export function DocumentsClient({
  docs,
  mine,
}: {
  docs: Doc[];
  mine: string | null;
}) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "grid">(() =>
    typeof window !== "undefined" && window.localStorage.getItem("celeste-docs-view") === "grid" ? "grid" : "list",
  );
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Doc | null>(null);
  const [signingDoc, setSigningDoc] = useState<Doc | null>(null);
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

  const filtered = docs.filter((d) => {
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
          {filtered.map((d) => (
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
                      <span className="flex items-center gap-0.5 text-[11px] font-medium text-gray-500">
                        <PenNib className="h-3 w-3" /> requires signature
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
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <button key={d.id} onClick={() => openPreview(d)} className="card card-hover text-left">
              <File className="h-5 w-5 text-gray-400" />
              <p className="mt-3 truncate text-sm font-semibold text-gray-900">{d.title}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {fmtBytes(d.file_size)} · {relativeTime(d.uploaded_at)}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <Badge tone="neutral">{d.category ?? "General"}</Badge>
                {d.requires_signature && <PenNib className="h-3.5 w-3.5 text-gray-500" />}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <Modal onClose={() => setPreview(null)} title="Document preview">
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-900">{preview.title}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
              <span>{fmtBytes(preview.file_size)}</span>
              <span>·</span>
              <span>Owner: {preview.owner?.full_name}</span>
            </div>
          </div>
          <div
            className={`flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-200 bg-gray-50 ${
              preview.mime_type === "application/pdf" ? "h-96" : "h-64"
            }`}
          >
            {previewUrl ? (
              preview.mime_type === "application/pdf" ? (
                <iframe
                  src={previewUrl}
                  title={preview.title}
                  className="h-full w-full"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={preview.title}
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
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setPreview(null)} className="btn-secondary">
              Close
            </button>
            {preview.requires_signature && (
              <button
                onClick={() => {
                  setSigningDoc(preview);
                  setPreview(null);
                }}
                className="btn-primary"
              >
                <PenNib className="h-4 w-4" />
                Sign Document
              </button>
            )}
          </div>
        </Modal>
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
    </div>
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