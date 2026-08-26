"use client";

import { useState } from "react";
import { X, ChatCircleText, Check, Spinner } from "@phosphor-icons/react";
import { submitFeedback } from "@/app/actions/feedback-actions";

const CATEGORIES = ["General", "Tooling", "Process", "Culture", "Workspace", "Other"];

// Minimal floating feedback widget — bottom-right corner, white, clean.
// Replaces the old full-screen modal.
export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState("General");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  async function submit() {
    if (saving || content.trim().length < 3) return;
    setSaving(true);
    setErr("");
    const res = await submitFeedback({ category, content });
    setSaving(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setSent(true);
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9999] w-[340px] animate-fade-in">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:bg-[#161616] dark:border-[rgba(255,255,255,0.1)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Your feedback</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center px-4 py-8 text-center">
            <Check className="h-8 w-8 text-gray-900" />
            <p className="mt-2 text-sm font-semibold text-gray-900">Thanks!</p>
            <p className="mt-0.5 text-[12px] text-gray-500">Feedback sent to the team.</p>
            <button
              onClick={onClose}
              className="mt-4 text-[12px] font-medium text-gray-400 hover:text-gray-700"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-4">
            {/* Category pills */}
            <div className="mb-3 flex flex-wrap gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    category === c
                      ? "bg-white text-black dark:bg-white dark:text-black"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-[rgba(255,255,255,0.08)] dark:text-gray-400 dark:hover:bg-[rgba(255,255,255,0.12)]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
              rows={3}
              maxLength={500}
              placeholder="What could be better for the team?"
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] leading-relaxed text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
            />

            {err && <p className="mt-1.5 text-[11px] text-red-500">{err}</p>}

            {/* Actions */}
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={onClose}
                className="text-[12px] font-medium text-gray-400 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving || content.trim().length < 3}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                {saving ? (
                  <Spinner className="h-3 w-3 animate-spin" />
                ) : (
                  <ChatCircleText className="h-3 w-3" />
                )}
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
