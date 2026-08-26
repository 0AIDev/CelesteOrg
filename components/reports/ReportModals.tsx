"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Sun, MoonStars, Spinner } from "@phosphor-icons/react";
import { submitMorningReport, submitEodReport } from "@/app/actions/report-actions";

type Status = "idle" | "saving" | "error";

export function MorningModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr] = useState("");

  async function submit() {
    setStatus("saving");
    const res = await submitMorningReport({ plan });
    if (!res.ok) {
      setStatus("error");
      setErr(res.error);
      return;
    }
    setStatus("idle");
    setPlan("");
    onClose();
    router.refresh();
  }

  return (
    <Overlay open={open} onClose={onClose} labelledBy="morning-title">
      <Sun className="mb-4 h-6 w-6 text-gray-900" />
      <h2 id="morning-title" className="text-xl font-semibold text-gray-900">
        Morning standup
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        What are you focusing on today? Share your plan with the team.
      </p>

      <label className="mt-5 mb-1.5 block text-[13px] font-medium text-gray-700">
        Today&apos;s focus
      </label>
      <textarea
        value={plan}
        onChange={(e) => setPlan(e.target.value)}
        rows={5}
        placeholder="e.g. Ship the org-chart view, review Maya's design drafts, and clean up the auth middleware…"
        className="input resize-none"
        autoFocus
      />
      {err && <p className="mt-2 text-xs text-gray-600">{err}</p>}

      <div className="mt-5 flex items-center justify-between gap-2">
        <button onClick={onClose} className="px-2 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
          Not now
        </button>
        <button
          onClick={submit}
          disabled={status === "saving" || plan.trim().length < 5}
          className="btn-primary disabled:opacity-50"
        >
          {status === "saving" ? (
            <Spinner className="h-4 w-4 animate-spin" />
          ) : (
            "Start Day"
          )}
        </button>
      </div>
    </Overlay>
  );
}

export function EodModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState("");
  const [blockers, setBlockers] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr] = useState("");

  async function submit() {
    setStatus("saving");
    const res = await submitEodReport({ summary, blockers });
    if (!res.ok) {
      setStatus("error");
      setErr(res.error);
      return;
    }
    setStatus("idle");
    setSummary("");
    setBlockers("");
    onClose();
    router.refresh();
  }

  return (
    <Overlay open={open} onClose={onClose} labelledBy="eod-title" persistent>
      <MoonStars className="mb-4 h-6 w-6 text-gray-900" />
      <h2 id="eod-title" className="text-xl font-semibold text-gray-900">
        Wrap up your day
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        What did you accomplish today? Any blockers the team should know about?
      </p>

      <label className="mt-5 mb-1.5 block text-[13px] font-medium text-gray-700">
        Accomplishments
      </label>
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={4}
        placeholder="e.g. Shipped the org chart, landed 3 approvals, unblocked the docs upload…"
        className="input resize-none"
        autoFocus
      />

      <label className="mt-4 mb-1.5 block text-[13px] font-medium text-gray-700">
        Blockers <span className="font-normal text-gray-400">(optional)</span>
      </label>
      <textarea
        value={blockers}
        onChange={(e) => setBlockers(e.target.value)}
        rows={2}
        placeholder="Anything blocking you?"
        className="input resize-none"
      />
      {err && <p className="mt-2 text-xs text-gray-600">{err}</p>}

      <div className="mt-5 flex items-center justify-between gap-2">
        <button onClick={onClose} className="px-2 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
          Remind me later
        </button>
        <button
          onClick={submit}
          disabled={status === "saving" || summary.trim().length < 5}
          className="btn-primary disabled:opacity-50"
        >
          {status === "saving" ? (
            <Spinner className="h-4 w-4 animate-spin" />
          ) : (
            "Submit EOD"
          )}
        </button>
      </div>
    </Overlay>
  );
}

function Overlay({
  open,
  onClose,
  labelledBy,
  children,
  persistent,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
  persistent?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={persistent ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {!persistent && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}