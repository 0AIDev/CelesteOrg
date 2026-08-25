"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle,
  Circle,
  Spinner,
  Rocket,
  PaperPlaneTilt,
  X,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Check,
  User,
  ListChecks,
  HouseSimple,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/Card";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Badge, statusTone } from "@/components/ui/Badge";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { relativeTime } from "@/lib/utils";
import { updateProfile } from "@/app/actions/settings-actions";
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

type ProfileData = {
  full_name: string;
  role_title: string | null;
  department_id: string | null;
  bio: string | null;
  location: string | null;
  previous_companies: string[] | null;
};

const STEPS = [
  { id: "profile", label: "Your profile", icon: User },
  { id: "checklist", label: "Checklist", icon: ListChecks },
];

export function OnboardingClient({
  myId,
  isAdmin,
  welcome,
  profile,
  tasks,
  toApprove,
  teammates,
}: {
  myId: string;
  isAdmin: boolean;
  welcome: boolean;
  profile: ProfileData | null;
  tasks: Task[];
  toApprove: ToApprove[];
  teammates: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<string>(welcome ? "profile" : "profile");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  // Local profile form state
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    bio: profile?.bio ?? "",
    location: profile?.location ?? "",
    companies: profile?.previous_companies ?? [],
    companyInput: "",
  });

  // Clearing the ?welcome= param so a manual refresh doesn't replay the hero.
  useEffect(() => {
    if (searchParams.get("welcome")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("welcome");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasProfile =
    profile && (profile.bio?.trim() || profile.location?.trim() || (profile.previous_companies?.length ?? 0) > 0);

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  // Completeness = profile filled AND all assigned tasks done (no tasks auto-completes).
  const profileComplete = Boolean(hasProfile);
  const checklistComplete = tasks.length > 0 ? doneCount === tasks.length : true;
  const overallPct = tasks.length ? Math.round(((doneCount + (profileComplete ? 1 : 0)) / (tasks.length + 1)) * 100) : profileComplete ? 100 : 0;
  const allDone = profileComplete && checklistComplete;

  async function saveProfile() {
    setBusy("profile");
    setErr("");
    const res = await updateProfile({
      full_name: form.full_name.trim() || undefined,
      bio: form.bio,
      location: form.location,
      previous_companies: form.companies.filter(Boolean),
    });
    setBusy(null);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setStep("checklist");
    router.refresh();
  }

  function addCompany() {
    const v = form.companyInput.trim();
    if (!v) return;
    setForm((f) => ({ ...f, companies: [...f.companies, v], companyInput: "" }));
  }
  function removeCompany(i: number) {
    setForm((f) => ({ ...f, companies: f.companies.filter((_, ix) => ix !== i) }));
  }

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

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* ── Welcome hero ─────────────────────────────────────────────── */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50/80 via-white to-white">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <SquircleAvatar
            name={profile?.full_name ?? "?"}
            size="xl"
            className="h-16 w-16 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {welcome ? `Welcome to Celeste, ${profile?.full_name?.split(" ")[0] ?? ""}!` : "Onboarding"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {profile?.role_title
                ? `${profile.role_title}${profile.department_id ? " · Celeste HQ" : ""}`
                : "Getting you set up on Celeste HQ."}{" "}
              — a few quick steps to make sure everything about you is ready.
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = step === s.id;
            const reachedProfile = s.id !== "profile";
            const done = (s.id === "profile" && profileComplete) || (s.id === "checklist" && checklistComplete);
            return (
              <div key={s.id} className="flex flex-1 items-center gap-2">
                <button
                  onClick={() => setStep(s.id)}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${done ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-600"}`}>
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className="h-px flex-1 bg-gray-100" />}
              </div>
            );
          })}
        </div>

        {/* Overall progress */}
        <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-gray-900 transition-all" style={{ width: `${overallPct}%` }} />
          </div>
          <span className="text-xs font-medium text-gray-500">{overallPct}% ready</span>
          {allDone && (
            <Badge tone="neutral">
              <Check className="mr-1 h-3 w-3" /> Complete
            </Badge>
          )}
        </div>
      </div>

      {/* ── Step: Profile ─────────────────────────────────────────────── */}
      {step === "profile" && (
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Tell us about you</h2>
          <p className="mb-5 text-xs text-gray-500">
            This shows on your profile and the org chart, so your teammates can get to know you.
          </p>

          <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Full name</label>
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="input"
            placeholder="Your name"
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="input"
                placeholder="City, Country"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Role</label>
              <input value={profile?.role_title ?? ""} disabled className="input opacity-60" />
            </div>
          </div>

          <label className="mb-1.5 mt-4 block text-[13px] font-medium text-gray-700">About you</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            className="input resize-none"
            placeholder="What should people know about you?"
          />

          <label className="mb-1.5 mt-4 block text-[13px] font-medium text-gray-700">
            Previous experience <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              value={form.companyInput}
              onChange={(e) => setForm({ ...form, companyInput: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCompany();
                }
              }}
              className="input flex-1"
              placeholder="Previous company or role"
            />
            <button onClick={addCompany} className="btn-secondary shrink-0">
              Add
            </button>
          </div>
          {form.companies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.companies.map((c, i) => (
                <span key={i} className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700">
                  {c}
                  <button onClick={() => removeCompany(i)} className="text-gray-400 hover:text-gray-900" aria-label="Remove">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {err && <p className="mt-3 text-xs text-gray-600">{err}</p>}

          <div className="mt-6 flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
            <button onClick={() => router.push("/dashboard")} className="px-2 py-1.5 text-sm font-medium text-gray-400 hover:text-gray-700">
              Skip to dashboard
            </button>
            <button
              onClick={saveProfile}
              disabled={busy === "profile" || !form.full_name.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {busy === "profile" ? <Spinner className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save &amp; continue
            </button>
          </div>
        </Card>
      )}

      {/* ── Step: Checklist ─────────────────────────────────────────────── */}
      {step === "checklist" && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ListChecks className="h-4 w-4" />
                Checklist
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {doneCount} of {tasks.length} tasks done
                {tasks.length > 0 && <> · {pct}%</>}
              </p>
            </div>
            {isAdmin && (
              <button onClick={() => router.refresh()} className="btn-secondary">
                Refresh
              </button>
            )}
          </div>

          {tasks.length === 0 ? (
            <Card>
              <div className="py-8 text-center">
                <Rocket className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-700">No checklist items yet</p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-gray-400">
                  Ask a founder or admin to assign you onboarding tasks, or skip ahead — you can
                  complete this any time from the sidebar.
                </p>
                <button onClick={() => router.push("/dashboard")} className="btn-primary mt-5">
                  <HouseSimple className="h-4 w-4" />
                  Go to dashboard
                </button>
              </div>
            </Card>
          ) : (
            <Card>
              <ul className="divide-y divide-gray-100">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 py-3">
                    <button
                      onClick={() =>
                        t.status === "done" ? setStatus(t.id, "pending") : setStatus(t.id, "done")
                      }
                      disabled={busy === t.id || busy === `${t.id}:done`}
                      className="mt-0.5 shrink-0 text-gray-300 hover:text-gray-900 disabled:opacity-50"
                      aria-label={t.status === "done" ? "Mark as to-do" : "Mark as done"}
                    >
                      {t.status === "done" ? (
                        <CheckCircle className="h-5 w-5 text-gray-900" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${t.status === "done" ? "text-gray-400 line-through" : "text-gray-900"}`}>
                        {t.title}
                      </p>
                      {t.description && <p className="mt-0.5 text-xs text-gray-500">{t.description}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {t.category && <Badge tone="neutral">{t.category}</Badge>}
                        {t.due_date && (
                          <span className="text-[11px] text-gray-400">
                            Due {new Date(t.due_date).toLocaleDateString()}
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
                        Submit
                      </button>
                    ) : (
                      <Badge tone="neutral">in review</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Approvals I owe */}
          {toApprove.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                To approve ({toApprove.filter((a) => a.status === "pending").length})
              </h2>
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
                            {a.status === "approved" ? "Approved" : "Rejected"}
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
                            aria-label="Approve"
                          >
                            {busy === a.id ? <Spinner className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => review(a.id, "rejected")}
                            disabled={busy === a.id}
                            className="rounded-md border border-gray-200 bg-gray-50 p-1.5 text-gray-900 hover:bg-gray-100 disabled:opacity-50"
                            aria-label="Reject"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-2">
            <button onClick={() => setStep("profile")} className="flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {allDone ? (
              <button onClick={() => router.push("/dashboard")} className="btn-primary">
                <Rocket className="h-4 w-4" />
                You&apos;re all set — enter Celeste
              </button>
            ) : (
              <button onClick={() => router.push("/dashboard")} className="btn-secondary">
                Finish later <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </>
      )}

      {err && <p className="mt-4 text-xs text-gray-600">{err}</p>}
    </div>
  );
}