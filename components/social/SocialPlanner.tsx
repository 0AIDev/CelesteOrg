"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  X,
  Spinner,
  Trash,
  PencilSimple,
  RocketLaunch,
  Lightning,
  CalendarBlank,
  CheckCircle,
  CircleDashed,
  Circle,
  ArrowSquareOut,
  LightningA,
} from "@phosphor-icons/react";
import {
  getSocialDrafts,
  createSocialDraft,
  updateSocialDraft,
  deleteSocialDraft,
  publishDraft,
  refineContent,
  type SocialDraft,
  type SocialPlatform,
  type DraftStatus,
} from "@/app/actions/social-draft-actions";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { useSession } from "@/components/layout/LayoutProvider";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORMS: { key: SocialPlatform; label: string; color: string }[] = [
  { key: "twitter", label: "Twitter / X", color: "#000" },
  { key: "linkedin", label: "LinkedIn", color: "#0a66c2" },
];

const STATUS_COLS: { key: DraftStatus; label: string; icon: typeof Circle }[] = [
  { key: "draft", label: "Drafts", icon: CircleDashed },
  { key: "scheduled", label: "Scheduled", icon: CalendarBlank },
  { key: "published", label: "Published", icon: CheckCircle },
];

const CHAR_LIMITS: Record<SocialPlatform, number> = {
  twitter: 280,
  linkedin: 3000,
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function SocialPlanner() {
  const { user } = useSession();
  const [drafts, setDrafts] = useState<SocialDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState<SocialPlatform | "">("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingDraft, setEditingDraft] = useState<SocialDraft | null>(null);

  const load = useCallback(async () => {
    const data = await getSocialDrafts();
    setDrafts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = drafts.filter((d) => {
    if (filterPlatform && d.platform !== filterPlatform) return false;
    return true;
  });

  const grouped: Record<DraftStatus, SocialDraft[]> = {
    draft: [],
    scheduled: [],
    published: [],
  };
  filtered.forEach((d) => grouped[d.status]?.push(d));

  async function handleDelete(id: string) {
    if (!confirm("Delete this draft?")) return;
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    await deleteSocialDraft(id);
  }

  async function handlePublish(id: string) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "published" as const, published_at: new Date().toISOString() } : d)),
    );
    await publishDraft(id);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Social Planner</h1>
          <p className="mt-0.5 text-sm text-gray-500">Draft, schedule, and launch social posts</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Platform filter */}
          <div className="flex rounded-lg border border-gray-200 bg-white">
            <button
              onClick={() => setFilterPlatform("")}
              className={cn(
                "rounded-l-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                !filterPlatform ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50",
              )}
            >
              All
            </button>
            {PLATFORMS.map((p) => (
              <button
                key={p.key}
                onClick={() => setFilterPlatform(p.key)}
                className={cn(
                  "px-3 py-1.5 text-[12px] font-medium transition-colors",
                  filterPlatform === p.key ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50",
                  p.key === "linkedin" && "rounded-r-lg",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-gray-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New Draft
          </button>
        </div>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-5 w-5 animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_COLS.map((col) => {
            const Icon = col.icon;
            return (
              <div key={col.key} className="min-w-[300px] flex-1">
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-gray-400" />
                  <h3 className="text-[13px] font-medium text-gray-700">{col.label}</h3>
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                    {grouped[col.key].length}
                  </span>
                </div>
                <div className="space-y-3 min-h-[120px]">
                  {grouped[col.key].map((draft) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      onEdit={() => setEditingDraft(draft)}
                      onDelete={() => handleDelete(draft.id)}
                      onPublish={() => handlePublish(draft.id)}
                    />
                  ))}
                  {grouped[col.key].length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
                      <p className="text-[12px] text-gray-300">No posts here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <DraftModal
          onClose={() => setShowCreate(false)}
          onSave={async (data) => {
            const res = await createSocialDraft(data);
            if (res.ok && res.draft) {
              setDrafts((prev) => [res.draft!, ...prev]);
              setShowCreate(false);
            }
            return res;
          }}
        />
      )}

      {/* Edit modal */}
      {editingDraft && (
        <DraftModal
          draft={editingDraft}
          onClose={() => setEditingDraft(null)}
          onSave={async (data) => {
            await updateSocialDraft(editingDraft.id, data);
            setDrafts((prev) =>
              prev.map((d) => (d.id === editingDraft.id ? { ...d, ...data } : d)),
            );
            setEditingDraft(null);
            return { ok: true };
          }}
        />
      )}
    </div>
  );
}

// ─── Draft Card ──────────────────────────────────────────────────────────────

function DraftCard({
  draft,
  onEdit,
  onDelete,
  onPublish,
}: {
  draft: SocialDraft;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
}) {
  const platform = PLATFORMS.find((p) => p.key === draft.platform);
  const charCount = draft.content.length;
  const limit = CHAR_LIMITS[draft.platform];
  const overLimit = charCount > limit;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm">
      {/* Platform + status */}
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              backgroundColor: `${platform?.color}10`,
              color: platform?.color,
            }}
          >
            {platform?.label}
          </span>
          {draft.hashtags && draft.hashtags.length > 0 && (
            <span className="text-[10px] text-gray-300">
              {draft.hashtags.length} tag{draft.hashtags.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={onEdit} className="rounded p-1 text-gray-300 hover:text-gray-600">
            <PencilSimple className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="rounded p-1 text-gray-300 hover:text-red-500">
            <Trash className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      {draft.title && (
        <p className="mb-1 text-[13px] font-semibold text-gray-900 line-clamp-1">{draft.title}</p>
      )}

      {/* Content */}
      <p className="text-[12.5px] leading-relaxed text-gray-600 line-clamp-4">{draft.content}</p>

      {/* Hashtags */}
      {draft.hashtags && draft.hashtags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {draft.hashtags.map((tag) => (
            <span key={tag} className="text-[11px] text-gray-400">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[10px] font-medium",
              overLimit ? "text-red-500" : "text-gray-300",
            )}
          >
            {charCount}/{limit}
          </span>
          {draft.scheduled_for && (
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <CalendarBlank className="h-2.5 w-2.5" />
              {new Date(draft.scheduled_for).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        {draft.status === "draft" && (
          <button
            onClick={onPublish}
            className="flex items-center gap-1 rounded-lg bg-gray-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-gray-700"
          >
            <RocketLaunch className="h-3 w-3" />
            Publish
          </button>
        )}
        {draft.status === "scheduled" && (
          <span className="flex items-center gap-1 text-[11px] text-blue-500">
            <CalendarBlank className="h-3 w-3" />
            Scheduled
          </span>
        )}
        {draft.status === "published" && (
          <span className="flex items-center gap-1 text-[11px] text-green-600">
            <CheckCircle className="h-3 w-3" />
            Live
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Draft Modal (Create / Edit) ────────────────────────────────────────────

function DraftModal({
  draft,
  onClose,
  onSave,
}: {
  draft?: SocialDraft;
  onClose: () => void;
  onSave: (data: {
    platform: SocialPlatform;
    title?: string;
    content: string;
    hashtags?: string[];
    scheduled_for?: string;
    status?: DraftStatus;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [platform, setPlatform] = useState<SocialPlatform>(draft?.platform ?? "twitter");
  const [title, setTitle] = useState(draft?.title ?? "");
  const [content, setContent] = useState(draft?.content ?? "");
  const [hashtags, setHashtags] = useState(draft?.hashtags?.join(", ") ?? "");
  const [scheduleDate, setScheduleDate] = useState(
    draft?.scheduled_for ? new Date(draft.scheduled_for).toISOString().slice(0, 16) : "",
  );
  const [saving, setSaving] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineStyle, setRefineStyle] = useState<"hook" | "professional" | "casual" | "engaging">("hook");
  const [error, setError] = useState("");

  const charLimit = CHAR_LIMITS[platform];
  const overLimit = content.length > charLimit;

  async function handleSave() {
    if (!content.trim() || saving) return;
    setSaving(true);
    setError("");
    const hashtagArr = hashtags
      .split(",")
      .map((h) => h.trim().replace(/^#/, ""))
      .filter(Boolean);

    const res = await onSave({
      platform,
      title: title.trim() || undefined,
      content: content.trim(),
      hashtags: hashtagArr.length > 0 ? hashtagArr : undefined,
      scheduled_for: scheduleDate ? new Date(scheduleDate).toISOString() : undefined,
    });
    setSaving(false);
    if (!res.ok) setError(res.error || "Save failed");
  }

  async function handleRefine() {
    if (!content.trim() || refining) return;
    setRefining(true);
    const res = await refineContent(content, platform, refineStyle);
    setRefining(false);
    if (res.ok && res.refined) {
      setContent(res.refined);
    } else {
      setError(res.error || "Refine failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            {draft ? "Edit Draft" : "New Draft"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* Platform selector */}
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-gray-500">Platform</label>
            <div className="flex gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPlatform(p.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-colors",
                    platform === p.key
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50",
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-[12px] font-medium text-gray-500">Title (optional)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title (internal only)"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
            />
          </div>

          {/* Content */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[12px] font-medium text-gray-500">Content</label>
              <span
                className={cn(
                  "text-[11px] font-medium",
                  overLimit ? "text-red-500" : "text-gray-300",
                )}
              >
                {content.length}/{charLimit}
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder={
                platform === "twitter"
                  ? "What's happening? (280 chars max)"
                  : "Write your LinkedIn post..."
              }
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
            />
          </div>

          {/* AI Refine */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
            <div className="mb-2 flex items-center gap-2">
              <LightningA className="h-4 w-4 text-gray-500" />
              <span className="text-[12px] font-medium text-gray-600">AI Refine</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(["hook", "professional", "casual", "engaging"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setRefineStyle(s)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                      refineStyle === s
                        ? "bg-gray-900 text-white"
                        : "border border-gray-200 text-gray-500 hover:bg-white",
                    )}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={handleRefine}
                disabled={!content.trim() || refining}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-gray-700 disabled:opacity-40"
              >
                {refining ? (
                  <Spinner className="h-3 w-3 animate-spin" />
                ) : (
                  <Lightning className="h-3 w-3" />
                )}
                Refine
              </button>
            </div>
          </div>

          {/* Hashtags */}
          <div>
            <label className="mb-1 block text-[12px] font-medium text-gray-500">Hashtags (comma separated)</label>
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="ai, startup, celeste"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="mb-1 block text-[12px] font-medium text-gray-500">Schedule (optional)</label>
            <DateTimePicker
              value={scheduleDate}
              onChange={setScheduleDate}
              placeholder="Select date & time"
            />
          </div>

          {error && <p className="text-[12px] text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
          <button onClick={onClose} className="text-[12px] font-medium text-gray-400 hover:text-gray-700">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!content.trim() || overLimit || saving}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-[12px] font-medium text-white hover:bg-gray-700 disabled:opacity-40"
          >
            {saving ? <Spinner className="h-3 w-3 animate-spin" /> : null}
            {draft ? "Save Changes" : "Create Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
