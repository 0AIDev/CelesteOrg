"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Circle, Spinner, Rocket, PaperPlaneTilt, X, UserPlus } from "@phosphor-icons/react";
import { Card } from "@/components/ui/Card";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Badge, statusTone } from "@/components/ui/Badge";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { relativeTime } from "@/lib/utils";
import {
  updateTaskStatus,
  submitTaskForApproval,
  reviewTaskApproval,
  assignTask,
} from "@/app/actions/onboarding-actions";

type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  due_date: string | null;
};

type ToApprove = {
  id: string;
  status: string;
  comment: string | null;
  created_at: string;
  task: { id: string; title: string; category: string | null; user_id: string };
};

export function OnboardingClient({
  myId,
  isAdmin,
  tasks,
  toApprove,
  teammates,
}: {
  myId: string;
  isAdmin: boolean;
  tasks: Task[];
  toApprove: ToApprove[];
  teammates: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [showAssign, setShowAssign] = useState(false);
  const [assign, setAssign] = useState({ userId: "", title: "", description: "" });

  async function setStatus(taskId: string, status: string) {
    setBusy(`${taskId}:${status}`);
    setErr("");
    const res = await updateTaskStatus({ taskId, status });
    setBusy(null);
    if (!res.ok) setErr(res.error);
    else router.refresh();
  }

  async function submit(taskId: string) {
    setBusy(taskId);
    setErr("");
    const res = await submitTaskForApproval({ taskId });
    setBusy(null);
    if (!res.ok) setErr(res.error);
    else router.refresh();
  }

  async function review(id: string, decision: "approved" | "rejected") {
    setBusy(id);
    setErr("");
    const res = await reviewTaskApproval({ taskApprovalId: id, decision });
    setBusy(null);
    if (!res.ok) setErr(res.error);
    else router.refresh();
  }

  async function doAssign() {
    if (!assign.userId || !assign.title) return;
    setBusy("assign");
    setErr("");
    const res = await assignTask(assign);
    setBusy(null);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setShowAssign(false);
    setAssign({ userId: "", title: "", description: "" });
    router.refresh();
  }

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-900">
            <Rocket className="h-5 w-5 text-gray-900" />
            Onboarding
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Checklist per i nuovi arrivi — ogni task completato passa dal manager.
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAssign(true)} className="btn-primary">
            <UserPlus className="h-4 w-4" />
            Assegna task
          </button>
        )}
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-900">
            {doneCount} di {tasks.length} task completati
          </span>
          <span className="font-semibold text-gray-900">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gray-900 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      {/* My checklist */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">La mia checklist</h2>
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Nessun task assegnato. Chiedi a un admin di assegnartene uno.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-3 py-3">
                <button
                  onClick={() =>
                    t.status === "done" ? setStatus(t.id, "pending") : setStatus(t.id, "done")
                  }
                  disabled={busy === t.id || busy === `${t.id}:done`}
                  className="mt-0.5 shrink-0 text-gray-300 hover:text-gray-900 disabled:opacity-50"
                  aria-label={t.status === "done" ? "Segna come da fare" : "Segna come fatto"}
                >
                  {t.status === "done" ? (
                    <CheckCircle className="h-5 w-5 text-gray-900" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${t.status === "done" ? "text-gray-400 line-through" : "text-gray-900"}`}
                  >
                    {t.title}
                  </p>
                  {t.description && (
                    <p className="mt-0.5 text-xs text-gray-500">{t.description}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {t.category && <Badge tone="neutral">{t.category}</Badge>}
                    {t.due_date && (
                      <span className="text-[11px] text-gray-400">
                        Scadenza {new Date(t.due_date).toLocaleDateString()}
                      </span>
                    )}
                    <Badge tone={statusTone(t.status)}>{t.status.replace("_", " ")}</Badge>
                  </div>
                </div>
                {t.status !== "done" ? (
                  <button
                    onClick={() => submit(t.id)}
                    disabled={busy === t.id}
                    className="btn-secondary !py-1.5 !px-2.5 text-xs disabled:opacity-50"
                  >
                    {busy === t.id ? <Spinner className="h-3.5 w-3.5 animate-spin" /> : <PaperPlaneTilt className="h-3.5 w-3.5" />}
                    Completa
                  </button>
                ) : (
                  <Badge tone="neutral">in revisione</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Approvals I owe */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Da approvare ({toApprove.filter((a) => a.status === "pending").length})
        </h2>
        {toApprove.length === 0 ? (
          <Card>
            <p className="py-6 text-center text-sm text-gray-400">Nessuna revisione in sospeso.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {toApprove.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start gap-3">
                  <SquircleAvatar name="?" size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{a.task.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {a.task.category ?? "Task"} · {relativeTime(a.created_at)}
                    </p>
                    {a.status !== "pending" && (
                      <p className="mt-1 text-xs text-gray-500">
                        {a.status === "approved" ? "Approvato" : "Rifiutato"}
                        {a.comment ? ` — ${a.comment}` : ""}
                      </p>
                    )}
                  </div>
                  {a.status === "pending" && (
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => review(a.id, "approved")}
                        disabled={busy === a.id}
                        className="rounded-md border border-gray-200 bg-gray-50 p-1.5 text-gray-900 hover:bg-gray-100 disabled:opacity-50"
                        aria-label="Approva"
                      >
                        {busy === a.id ? <Spinner className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => review(a.id, "rejected")}
                        disabled={busy === a.id}
                        className="rounded-md border border-gray-200 bg-gray-50 p-1.5 text-gray-900 hover:bg-gray-100 disabled:opacity-50"
                        aria-label="Rifiuta"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {err && <p className="mt-4 text-xs text-gray-600">{err}</p>}

      {/* Assign modal (admin/founder) */}
      {showAssign && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowAssign(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-2xl backdrop-blur-xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-base font-semibold text-gray-900">Assegna task di onboarding</h3>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Teammate</label>
            <CustomSelect
              value={assign.userId}
              onValueChange={(v) => setAssign({ ...assign, userId: v })}
              options={teammates.map((t) => ({ value: t.id, label: t.full_name ?? t.id }))}
              placeholder="Scegli…"
            />
            <label className="mb-1.5 mt-4 block text-[13px] font-medium text-gray-700">Task</label>
            <input
              value={assign.title}
              onChange={(e) => setAssign({ ...assign, title: e.target.value })}
              placeholder="es. Imposta laptop e accessi"
              className="input"
              autoFocus
            />
            <label className="mb-1.5 mt-4 block text-[13px] font-medium text-gray-700">
              Dettagli <span className="font-normal text-gray-400">(opzionale)</span>
            </label>
            <textarea
              value={assign.description}
              onChange={(e) => setAssign({ ...assign, description: e.target.value })}
              rows={2}
              className="input resize-none"
            />
            <div className="mt-5 flex items-center justify-between gap-2">
              <button onClick={() => setShowAssign(false)} className="px-2 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
                Annulla
              </button>
              <button
                onClick={doAssign}
                disabled={busy === "assign" || !assign.userId || !assign.title}
                className="btn-primary disabled:opacity-50"
              >
                {busy === "assign" ? <Spinner className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Assegna
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}