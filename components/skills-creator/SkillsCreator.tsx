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
  Code,
  Lightning,
  Download,
  PencilSimple,
} from "@phosphor-icons/react";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { cn } from "@/lib/utils";
import {
  createSkill,
  upvoteSkill,
  deleteSkill,
  type SkillRow,
} from "@/app/actions/skills-actions";
import { exportToSkillsMd } from "@/lib/skills/export";

const TAGS = [
  "Automation",
  "Code Generation",
  "Review",
  "Testing",
  "Documentation",
  "DevOps",
  "AI/ML",
  "Frontend",
  "Backend",
  "General",
];

// ── Main component ──────────────────────────────────────────────────────────
export function SkillsCreator({
  initialSkills = [],
  currentUserId,
}: {
  initialSkills?: SkillRow[];
  currentUserId?: string | null;
}) {
  const [skills, setSkills] = useState<SkillRow[]>(initialSkills);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const filtered = filter
    ? skills.filter((s) => s.tags?.includes(filter))
    : skills;

  async function handleUpvote(id: string) {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, upvotes: s.upvotes + 1 } : s)),
    );
    const res = await upvoteSkill(id);
    if (!res.ok) {
      setSkills((prev) =>
        prev.map((s) => (s.id === id ? { ...s, upvotes: s.upvotes - 1 } : s)),
      );
    } else if (res.upvotes != null) {
      setSkills((prev) =>
        prev.map((s) => (s.id === id ? { ...s, upvotes: res.upvotes! } : s)),
      );
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteSkill(id);
    if (res.ok) setSkills((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleCreate(data: {
    name: string;
    description: string;
    trigger_text: string;
    implementation: string;
    parameters: { name: string; type: string; required: boolean; description: string }[];
    example_usage: string;
    tags: string[];
  }) {
    const res = await createSkill(data);
    if (res.ok && res.id) {
      setSkills((prev) => [
        {
          id: res.id!,
          name: data.name,
          description: data.description || null,
          trigger_text: data.trigger_text || null,
          implementation: data.implementation,
          parameters: data.parameters,
          example_usage: data.example_usage || null,
          author_id: currentUserId ?? null,
          upvotes: 0,
          tags: data.tags,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: null,
        },
        ...prev,
      ]);
      setShowCreate(false);
    }
  }

  function handleExport(skill: SkillRow) {
    const md = exportToSkillsMd(skill);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${skill.name.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(skill.id);
    setTimeout(() => setExporting(null), 2000);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Skills Creator
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Create, manage, and export agent skill definitions. Build reusable capabilities for your AI team.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-gray-700"
        >
          <Plus className="h-3.5 w-3.5" />
          New skill
        </button>
      </div>

      {/* Tag filter */}
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
          All ({skills.length})
        </button>
        {TAGS.map((tag) => {
          const count = skills.filter((s) => s.tags?.includes(tag)).length;
          if (count === 0) return null;
          return (
            <button
              key={tag}
              onClick={() => setFilter(filter === tag ? null : tag)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                filter === tag
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
              )}
            >
              {tag} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
          <Code className="h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">
            {filter ? `No ${filter} skills yet` : "No skills yet"}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Create reusable agent skills for your team.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onUpvote={handleUpvote}
              onDelete={handleDelete}
              onExport={handleExport}
              isAuthor={skill.author_id === currentUserId}
              isExporting={exporting === skill.id}
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
function SkillCard({
  skill,
  onUpvote,
  onDelete,
  onExport,
  isAuthor,
  isExporting,
}: {
  skill: SkillRow;
  onUpvote: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (skill: SkillRow) => void;
  isAuthor: boolean;
  isExporting: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function copyToClipboard() {
    try {
      const md = exportToSkillsMd(skill);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    await onDelete(skill.id);
    setDeleting(false);
  }

  return (
    <div className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-gray-200 hover:shadow-sm">
      {/* Header: name + actions */}
      <div className="mb-2.5 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Code className="h-3.5 w-3.5 text-gray-600" />
          </div>
          <h3 className="text-[14px] font-semibold text-gray-900 leading-snug">
            {skill.name}
          </h3>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {isAuthor && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md p-1 text-gray-300 hover:text-red-500"
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
      </div>

      {/* Description */}
      {skill.description && (
        <p className="mb-2 text-[12px] leading-relaxed text-gray-500 line-clamp-2">
          {skill.description}
        </p>
      )}

      {/* Tags */}
      {skill.tags && skill.tags.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1">
          {skill.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500"
            >
              {tag}
            </span>
          ))}
          {skill.tags.length > 3 && (
            <span className="text-[10px] text-gray-400">+{skill.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Implementation preview */}
      <div
        className="mt-1 flex-1 cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-gray-50/60 p-3 transition-colors hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <pre className={cn(
          "whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-gray-700",
          expanded ? "max-h-64 overflow-y-auto" : "max-h-20 overflow-hidden",
        )}>
          {skill.implementation}
        </pre>
        {!expanded && skill.implementation.length > 200 && (
          <p className="mt-1 text-[10px] text-gray-400">Click to expand</p>
        )}
      </div>

      {/* Footer: upvote + copy + export + author */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* Upvote */}
          <button
            onClick={() => onUpvote(skill.id)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50"
          >
            <ArrowUp className="h-3 w-3" />
            <span className="tabular-nums">{skill.upvotes}</span>
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

          {/* Export .md */}
          <button
            onClick={() => onExport(skill)}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-all",
              isExporting
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50",
            )}
          >
            {isExporting ? (
              <>
                <Check className="h-3 w-3" />
                Saved
              </>
            ) : (
              <>
                <Download className="h-3 w-3" />
                .md
              </>
            )}
          </button>
        </div>

        {/* Author */}
        {skill.author && (
          <div className="flex items-center gap-1.5">
            <SquircleAvatar
              name={skill.author.full_name}
              src={skill.author.avatar_url}
              size="xs"
              className="h-5 w-5 text-[8px]"
            />
            <span className="text-[10.5px] text-gray-400">
              {skill.author.full_name}
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
    name: string;
    description: string;
    trigger_text: string;
    implementation: string;
    parameters: { name: string; type: string; required: boolean; description: string }[];
    example_usage: string;
    tags: string[];
  }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerText, setTriggerText] = useState("");
  const [implementation, setImplementation] = useState("");
  const [exampleUsage, setExampleUsage] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [parameters, setParameters] = useState<
    { name: string; type: string; required: boolean; description: string }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [showParams, setShowParams] = useState(false);

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function addParameter() {
    setParameters((prev) => [
      ...prev,
      { name: "", type: "string", required: false, description: "" },
    ]);
    setShowParams(true);
  }

  function updateParameter(index: number, field: string, value: string | boolean) {
    setParameters((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  }

  function removeParameter(index: number) {
    setParameters((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !implementation.trim()) return;
    setSaving(true);
    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      trigger_text: triggerText.trim(),
      implementation: implementation.trim(),
      parameters: parameters.filter((p) => p.name.trim()),
      example_usage: exampleUsage.trim(),
      tags,
    });
    setSaving(false);
  }

  function applyTemplate() {
    setName("New Skill");
    setImplementation(`# Skill Name\n\n## Description\nWhat this skill does.\n\n## Trigger\n- When the user asks to...\n\n## Implementation\n\`\`\`typescript\n// Your code here\n\`\`\`\n\n## Parameters\n| Name | Type | Required | Description |\n|------|------|----------|-------------|\n| param1 | string | yes | Description |\n\n## Example Usage\n\`\`\`\nUser: Do something\nAgent: [uses the skill]\n\`\`\``);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">
            New skill
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Template button */}
          {!implementation.trim() && (
            <button
              type="button"
              onClick={applyTemplate}
              className="flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-left transition-colors hover:border-gray-400 hover:bg-gray-100"
            >
              <Lightning className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-[12px] font-medium text-gray-700">Use skills.md template</p>
                <p className="text-[11px] text-gray-400">Pre-filled structure for skill definitions</p>
              </div>
            </button>
          )}

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Skill name"
            className="input h-9 text-[13px]"
            autoFocus
          />

          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            className="input h-9 text-[13px]"
          />

          <input
            value={triggerText}
            onChange={(e) => setTriggerText(e.target.value)}
            placeholder="When to use this skill (e.g. 'When user asks to review code')"
            className="input h-9 text-[13px]"
          />

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  tags.includes(tag)
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                )}
              >
                {tag}
              </button>
            ))}
          </div>

          <textarea
            value={implementation}
            onChange={(e) => setImplementation(e.target.value)}
            placeholder="Implementation code or skill definition..."
            rows={8}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
          />

          <textarea
            value={exampleUsage}
            onChange={(e) => setExampleUsage(e.target.value)}
            placeholder="Example usage (optional)"
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
          />

          {/* Parameters */}
          <div>
            <button
              type="button"
              onClick={() => setShowParams(!showParams)}
              className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-gray-700"
            >
              <PencilSimple className="h-3 w-3" />
              {showParams ? "Hide" : "Add"} parameters
              {parameters.length > 0 && ` (${parameters.length})`}
            </button>
            {showParams && (
              <div className="mt-2 space-y-2">
                {parameters.map((param, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={param.name}
                      onChange={(e) => updateParameter(i, "name", e.target.value)}
                      placeholder="Name"
                      className="input h-8 w-24 text-[11px]"
                    />
                    <input
                      value={param.type}
                      onChange={(e) => updateParameter(i, "type", e.target.value)}
                      placeholder="Type"
                      className="input h-8 w-20 text-[11px]"
                    />
                    <input
                      value={param.description}
                      onChange={(e) => updateParameter(i, "description", e.target.value)}
                      placeholder="Description"
                      className="input h-8 flex-1 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => removeParameter(i)}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addParameter}
                  className="text-[11px] text-gray-400 hover:text-gray-600"
                >
                  + Add parameter
                </button>
              </div>
            )}
          </div>

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
              disabled={saving || !name.trim() || !implementation.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
            >
              {saving ? <Spinner className="h-3 w-3 animate-spin" /> : null}
              Save skill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
