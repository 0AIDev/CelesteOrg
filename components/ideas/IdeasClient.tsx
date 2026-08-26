"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Plus, Spinner, X } from "@phosphor-icons/react";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Badge } from "@/components/ui/Badge";
import { createIdea } from "@/app/actions/idea-actions";
import { relativeTime } from "@/lib/utils";

type Idea = {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  priority: string;
  status: string;
  ai_summary: string | null;
  created_at: string;
  author: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

export function IdeasClient({ ideas, initialOpen }: { ideas: Idea[]; initialOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (initialOpen) setOpen(true);
  }, [initialOpen]);

  async function submit() {
    setSaving(true);
    setErr("");
    const res = await createIdea({ title, content, priority });
    setSaving(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setTitle("");
    setContent("");
    setPriority("medium");
    setOpen(false);
    router.replace("/ideas");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-900">
            <Lightbulb className="h-5 w-5 text-gray-900" />
            Idea Vault
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Every idea, big or small. Automatically categorized on submit.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          New Idea
        </button>
      </div>

      {ideas.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Lightbulb className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No ideas yet. Be the first to share one!</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ideas.map((idea) => (
          <div key={idea.id} className="card card-hover">
            <div className="flex items-start justify-between gap-2">
              <Badge tone="neutral">{idea.category ?? "General"}</Badge>
              <Badge tone="neutral">{idea.status}</Badge>
            </div>
            <h3 className="mt-3 text-[15px] font-semibold leading-snug text-gray-900">
              {idea.title}
            </h3>
            {idea.ai_summary && (
              <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-gray-500">
                {idea.ai_summary}
              </p>
            )}
            <div className="mt-4 flex items-center gap-2 border-t border-gray-50 pt-3">
              <SquircleAvatar
                name={idea.author?.full_name}
                src={idea.author?.avatar_url}
                size="xs"
              />
              <span className="truncate text-xs text-gray-500">
                {idea.author?.full_name}
              </span>
              <span className="ml-auto text-[11px] text-gray-400">
                {relativeTime(idea.created_at)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">New idea</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's the idea?"
              className="input"
              autoFocus
            />

            <label className="mb-1.5 mt-4 block text-[13px] font-medium text-gray-700">
              Details <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="A sentence or two…"
              className="input resize-none"
            />

            <label className="mb-1.5 mt-4 block text-[13px] font-medium text-gray-700">Priority</label>
            <div className="flex gap-1.5">
              {(["low", "medium", "high"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`pill capitalize ${priority === p ? "pill-active" : "bg-white"}`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="mt-4 text-[11px] text-gray-400">
              Auto-categorized by Celeste AI
            </div>

            {err && <p className="mt-2 text-xs text-gray-600">{err}</p>}

            <div className="mt-5 flex items-center justify-between gap-2">
              <button onClick={() => setOpen(false)} className="px-2 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving || title.trim().length < 3}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? <Spinner className="h-4 w-4 animate-spin" /> : "Submit idea"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}