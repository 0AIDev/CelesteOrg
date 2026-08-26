"use client";

import { useState } from "react";
import {
  ArrowUp,
  Copy,
  Check,
  Plus,
  X,
  Trash,
  Spinner,
  Lightning,
  MagicWand,
  Terminal,
  Robot,
  Gear,
  Code,
  DevToLogo,
} from "@phosphor-icons/react";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  createPrompt,
  upvotePrompt,
  deletePrompt,
  type PromptRow,
} from "@/app/actions/prompt-vault-actions";

const CATEGORIES = [
  "Cursor",
  "Claude",
  "ChatGPT",
  "Gemini",
  "Groq",
  "Automation",
  "System Prompt",
  "Workflow",
  "DevOps",
  "General",
];

const CATEGORY_ICON: Record<string, typeof Lightning> = {
  Cursor: MagicWand,
  Claude: Robot,
  ChatGPT: Lightning,
  Gemini: MagicWand,
  Groq: Lightning,
  Automation: Gear,
  "System Prompt": Terminal,
  Workflow: Code,
  DevOps: DevToLogo,
  General: Lightning,
};



// ── Main component ──────────────────────────────────────────────────────────
export function PromptVault({
  initialPrompts = [],
  currentUserId,
}: {
  initialPrompts?: PromptRow[];
  currentUserId?: string | null;
}) {
  const [prompts, setPrompts] = useState<PromptRow[]>(initialPrompts);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter
    ? prompts.filter((p) => p.category === filter)
    : prompts;

  async function handleUpvote(id: string) {
    setPrompts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, upvotes: p.upvotes + 1 } : p)),
    );
    const res = await upvotePrompt(id);
    if (!res.ok) {
      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, upvotes: p.upvotes - 1 } : p)),
      );
    } else if (res.upvotes != null) {
      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, upvotes: res.upvotes! } : p)),
      );
    }
  }

  async function handleDelete(id: string) {
    const res = await deletePrompt(id);
    if (res.ok) setPrompts((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleCreate(data: {
    title: string;
    description: string;
    category: string;
    prompt_content: string;
  }) {
    const res = await createPrompt(data);
    if (res.ok && res.id) {
      setPrompts((prev) => [
        {
          id: res.id!,
          title: data.title,
          description: data.description || null,
          category: data.category,
          prompt_content: data.prompt_content,
          author_id: currentUserId ?? null,
          upvotes: 0,
          created_at: new Date().toISOString(),
          author: null,
        },
        ...prev,
      ]);
      setShowCreate(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Prompt Vault
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Shared AI prompts and workflows for the team. Copy, upvote, and contribute.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-gray-700"
        >
          <Plus className="h-3.5 w-3.5" />
          New prompt
        </button>
      </div>

      {/* Category filter */}
      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter(null)}
          className={cn(
            "whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
            !filter
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
          )}
        >
          All ({prompts.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = prompts.filter((p) => p.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setFilter(filter === cat ? null : cat)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                filter === cat
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
              )}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
          <Lightning className="h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">
            {filter ? `No ${filter} prompts yet` : "No prompts yet"}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Share your best AI prompts with the team.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onUpvote={handleUpvote}
              onDelete={handleDelete}
              isAuthor={prompt.author_id === currentUserId}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}

// ── Single card ─────────────────────────────────────────────────────────────
function PromptCard({
  prompt,
  onUpvote,
  onDelete,
  isAuthor,
}: {
  prompt: PromptRow;
  onUpvote: (id: string) => void;
  onDelete: (id: string) => void;
  isAuthor: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const CatIcon = CATEGORY_ICON[prompt.category] ?? Lightning;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(prompt.prompt_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = prompt.prompt_content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    await onDelete(prompt.id);
    setDeleting(false);
  }

  return (
    <div className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-gray-200 hover:shadow-sm">
      {/* Category badge + delete */}
      <div className="mb-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10.5px] font-medium text-gray-600">
          <CatIcon className="h-3 w-3" />
          {prompt.category}
        </span>
        {isAuthor && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md p-1 text-gray-300 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100"
            title="Delete"
          >
            {deleting ? (
              <Spinner className="h-3 w-3 animate-spin" />
            ) : (
              <Trash className="h-3 w-3" />
            )}
          </button>
        )}
      </div>

      {/* Title + description */}
      <h3 className="text-[14px] font-semibold text-gray-900 leading-snug">
        {prompt.title}
      </h3>
      {prompt.description && (
        <p className="mt-1 text-[12px] leading-relaxed text-gray-500 line-clamp-2">
          {prompt.description}
        </p>
      )}

      {/* Prompt block */}
      <div className="mt-3 flex-1 overflow-hidden rounded-xl border border-gray-100 bg-gray-50/60 p-3">
        <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-gray-700">
          {prompt.prompt_content}
        </pre>
      </div>

      {/* Footer: upvote + copy + author */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Upvote */}
          <button
            onClick={() => onUpvote(prompt.id)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50"
          >
            <ArrowUp className="h-3 w-3" />
            <span className="tabular-nums">{prompt.upvotes}</span>
          </button>

          {/* Copy */}
          <button
            onClick={copyToClipboard}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-all",
              copied
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50",
            )}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>

        {/* Author */}
        {prompt.author && (
          <div className="flex items-center gap-1.5">
            <SquircleAvatar
              name={prompt.author.full_name}
              src={prompt.author.avatar_url}
              size="xs"
              className="h-5 w-5 text-[8px]"
            />
            <span className="text-[10.5px] text-gray-400">
              {prompt.author.full_name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Create modal ────────────────────────────────────────────────────────────
function CreateModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    category: string;
    prompt_content: string;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [promptContent, setPromptContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !promptContent.trim()) return;
    setSaving(true);
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      prompt_content: promptContent.trim(),
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">
            New prompt
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Prompt title"
            className="input h-9 text-[13px]"
            autoFocus
          />

          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            className="input h-9 text-[13px]"
          />

          {/* Category select */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  category === cat
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <textarea
            value={promptContent}
            onChange={(e) => setPromptContent(e.target.value)}
            placeholder="Paste your prompt here..."
            rows={8}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-[12px] font-medium text-gray-400 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !promptContent.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
            >
              {saving ? <Spinner className="h-3 w-3 animate-spin" /> : null}
              Save prompt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
