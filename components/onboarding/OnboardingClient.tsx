"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Spinner,
  User,
  Buildings,
  Code,
  Sliders,
  Lock,
} from "@phosphor-icons/react";

import {
  saveOnboardingStep1,
  saveOnboardingStep2,
  saveOnboardingStep3,
  saveOnboardingStep4,
  signNDA,
  completeOnboarding,
} from "@/app/actions/onboarding-actions";

const STEP_META = [
  { id: "identity", label: "Your profile", icon: User },
  { id: "department", label: "Department", icon: Buildings },
  { id: "tech", label: "Tech stack", icon: Code },
  { id: "preferences", label: "Work style", icon: Sliders },
  { id: "nda", label: "NDA & Sign", icon: Lock },
];

// ── Tech tags ───────────────────────────────────────────────────────────────
const LANGUAGES = ["TypeScript", "Python", "Rust", "Go", "Java", "C++", "Swift", "Kotlin", "Ruby", "PHP"];
const FRAMEWORKS = ["Next.js", "React", "Vue", "Svelte", "Django", "FastAPI", "Rails", "Express", "NestJS", "Tailwind CSS"];
const MODELS = ["Phi-4-mini", "DeepSeek-R1", "Qwen 2.5", "Llama 3", "Mistral", "Gemma 2", "GPT-4o (API)", "Claude (API)"];

type Department = { id: string; name: string; slug: string };
type OnboardingData = {
  profile: Record<string, unknown> | null;
  techSpecs: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
  hasSignedNDA: boolean;
  departments: Department[];
  user: { id: string; email: string };
};

export function OnboardingClient({ data }: { data: OnboardingData }) {
  const router = useRouter();
  const { profile, departments } = data;

  // Determine starting step from existing data
  const initialStep = (() => {
    if (data.hasSignedNDA) return 4; // already done
    if (data.preferences) return 3;
    if (data.techSpecs) return 2;
    if (profile?.department_id) return 1;
    return 0;
  })();

  const [step, setStep] = useState(initialStep);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  // ── Step 1 state ────────────────────────────────────────────────────────
  const [s1, setS1] = useState({
    full_name: (profile?.full_name as string) ?? "",
    location: (profile?.location as string) ?? "",
    bio: (profile?.bio as string) ?? "",
    companies: (profile?.previous_companies as string[]) ?? [],
    companyInput: "",
  });

  // ── Step 2 state ────────────────────────────────────────────────────────
  const [departmentId, setDepartmentId] = useState(
    (profile?.department_id as string) ?? "",
  );

  // ── Step 3 state ────────────────────────────────────────────────────────
  const [s3, setS3] = useState({
    primary_language: (data.techSpecs?.primary_language as string) ?? "",
    frameworks: (data.techSpecs?.frameworks as string[]) ?? [],
    local_model: (data.techSpecs?.local_model as string) ?? "",
    hardware_notes: (data.techSpecs?.hardware_notes as string) ?? "",
  });
  const [langInput, setLangInput] = useState("");

  // ── Step 4 state ────────────────────────────────────────────────────────
  const [s4, setS4] = useState({
    focus_hours: (data.preferences?.focus_hours as string) ?? "",
    communication_channel: (data.preferences?.communication_channel as string) ?? "",
    notifications_enabled: (data.preferences?.notifications_enabled as boolean) ?? true,
    availability_status: (data.preferences?.availability_status as string) ?? "available",
  });

  // ── Step 5 state ────────────────────────────────────────────────────────
  const [s5, setS5] = useState({
    typed_name: "",
    agreed: false,
    signed: data.hasSignedNDA,
  });

  const goNext = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setStep((s) => Math.min(s + 1, STEP_META.length - 1));
      setTransitioning(false);
      setErr("");
    }, 200);
  }, []);

  const goPrev = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setStep((s) => Math.max(s - 1, 0));
      setTransitioning(false);
      setErr("");
    }, 200);
  }, []);

  // ── Save handlers ───────────────────────────────────────────────────────
  async function saveStep1() {
    if (!s1.full_name.trim()) return;
    setBusy(true);
    setErr("");
    const res = await saveOnboardingStep1({
      full_name: s1.full_name,
      location: s1.location,
      bio: s1.bio,
      previous_companies: s1.companies.filter(Boolean),
    });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    goNext();
  }

  async function saveStep2() {
    if (!departmentId) return;
    setBusy(true);
    setErr("");
    const res = await saveOnboardingStep2({ department_id: departmentId });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    goNext();
  }

  async function saveStep3() {
    setBusy(true);
    setErr("");
    const res = await saveOnboardingStep3({
      primary_language: s3.primary_language,
      frameworks: s3.frameworks,
      local_model: s3.local_model,
      hardware_notes: s3.hardware_notes,
    });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    goNext();
  }

  async function saveStep4() {
    setBusy(true);
    setErr("");
    const res = await saveOnboardingStep4({
      focus_hours: s4.focus_hours,
      communication_channel: s4.communication_channel,
      notifications_enabled: s4.notifications_enabled,
      availability_status: s4.availability_status,
    });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    goNext();
  }

  async function saveStep5() {
    if (s5.signed) {
      // Already signed — just complete.
      const cRes = await completeOnboarding();
      if (cRes.ok) router.push("/dashboard");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await signNDA({ typed_name: s5.typed_name, agreed: s5.agreed });
    if (!res.ok) { setBusy(false); setErr(res.error); return; }
    const cRes = await completeOnboarding();
    setBusy(false);
    if (!cRes.ok) { setErr(cRes.error); return; }
    router.push("/dashboard");
  }

  function addFramework(fw: string) {
    if (!fw || s3.frameworks.includes(fw)) return;
    setS3((p) => ({ ...p, frameworks: [...p.frameworks, fw] }));
  }
  function removeFramework(fw: string) {
    setS3((p) => ({ ...p, frameworks: p.frameworks.filter((f) => f !== fw) }));
  }

  const pct = Math.round(((step + 1) / STEP_META.length) * 100);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Welcome to Celeste, {s1.full_name.split(" ")[0] || (profile?.full_name as string)?.split(" ")[0] || ""}!
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Let&apos;s set up your profile in a few quick steps.
        </p>
      </div>

      {/* ── Progress bar ───────────────────────────────────────────────── */}
      <div className="mb-2 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gray-900 transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-400 tabular-nums">{step + 1}/{STEP_META.length}</span>
      </div>

      {/* ── Step indicators ────────────────────────────────────────────── */}
      <div className="mb-8 flex items-center justify-center gap-1">
        {STEP_META.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => { if (i <= step) { setTransitioning(true); setTimeout(() => { setStep(i); setTransitioning(false); }, 200); }}}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                  done
                    ? "bg-gray-900 text-white"
                    : active
                      ? "bg-gray-900 text-white ring-2 ring-gray-900/20"
                      : "bg-gray-100 text-gray-400"
                }`}
                title={s.label}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </button>
              {i < STEP_META.length - 1 && (
                <div className={`mx-1 h-px w-4 sm:w-8 ${i < step ? "bg-gray-900" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step content ───────────────────────────────────────────────── */}
      <div
        className={`flex-1 transition-opacity duration-200 ${transitioning ? "opacity-0" : "opacity-100"}`}
      >
        {/* Step 1: Identity */}
        {step === 0 && (
          <StepCard title="Your profile" subtitle="Basic info that shows on your profile and the org chart.">
            <Field label="Full name" required>
              <input className="input" value={s1.full_name} onChange={(e) => setS1({ ...s1, full_name: e.target.value })} placeholder="Mattia Vizzi" autoFocus />
            </Field>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Location">
                <input className="input" value={s1.location} onChange={(e) => setS1({ ...s1, location: e.target.value })} placeholder="Milan, Italy" />
              </Field>
              <Field label="Role" hint="Set by your admin">
                <input className="input opacity-60" value={(profile?.role_title as string) ?? ""} disabled />
              </Field>
            </div>
            <Field label="About you" className="mt-4">
              <textarea className="input resize-none" rows={3} value={s1.bio} onChange={(e) => setS1({ ...s1, bio: e.target.value })} placeholder="What should people know about you?" />
            </Field>
            <Field label="Previous experience" hint="optional" className="mt-4">
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  value={s1.companyInput}
                  onChange={(e) => setS1({ ...s1, companyInput: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = s1.companyInput.trim(); if (v) setS1({ ...s1, companies: [...s1.companies, v], companyInput: "" }); }}}
                  placeholder="e.g. Google, Stripe..."
                />
                <button type="button" onClick={() => { const v = s1.companyInput.trim(); if (v) setS1({ ...s1, companies: [...s1.companies, v], companyInput: "" }); }} className="btn-secondary shrink-0">Add</button>
              </div>
              {s1.companies.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s1.companies.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                      {c}
                      <button onClick={() => setS1({ ...s1, companies: s1.companies.filter((_, j) => j !== i) })} className="ml-0.5 text-gray-400 hover:text-gray-900">×</button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
          </StepCard>
        )}

        {/* Step 2: Department */}
        {step === 1 && (
          <StepCard title="Department & track" subtitle="Choose your primary department.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {departments.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDepartmentId(d.id)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-5 text-center transition-all ${
                    departmentId === d.id
                      ? "border-gray-900 bg-gray-900 text-white shadow-lg"
                      : "border-gray-200 bg-white/60 text-gray-600 hover:border-gray-300 hover:bg-white"
                  }`}
                >
                  <Buildings className={`h-5 w-5 ${departmentId === d.id ? "text-white" : "text-gray-400"}`} />
                  <span className="text-sm font-medium">{d.name}</span>
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {/* Step 3: Tech Stack */}
        {step === 2 && (
          <StepCard title="Tech stack & hardware" subtitle="Help us understand your setup (all optional).">
            <Field label="Primary language / framework">
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l}
                    onClick={() => setS3({ ...s3, primary_language: s3.primary_language === l ? "" : l })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      s3.primary_language === l
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Frameworks & tools" hint="select multiple" className="mt-4">
              <div className="flex flex-wrap gap-1.5">
                {FRAMEWORKS.map((f) => {
                  const active = s3.frameworks.includes(f);
                  return (
                    <button
                      key={f}
                      onClick={() => active ? removeFramework(f) : addFramework(f)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        active
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Preferred local model" className="mt-4">
              <div className="flex flex-wrap gap-1.5">
                {MODELS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setS3({ ...s3, local_model: s3.local_model === m ? "" : m })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      s3.local_model === m
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Hardware notes" hint="optional" className="mt-4">
              <input className="input" value={s3.hardware_notes} onChange={(e) => setS3({ ...s3, hardware_notes: e.target.value })} placeholder="e.g. AMD Ryzen, RTX 4090, 64GB RAM" />
            </Field>
          </StepCard>
        )}

        {/* Step 4: Preferences */}
        {step === 3 && (
          <StepCard title="Work style & preferences" subtitle="How you like to work.">
            <Field label="Core focus hours">
              <input className="input" value={s4.focus_hours} onChange={(e) => setS4({ ...s4, focus_hours: e.target.value })} placeholder="e.g. 09:00-12:00, 14:00-17:00" />
            </Field>
            <Field label="Preferred communication channel" className="mt-4">
              <div className="flex gap-2">
                {["Slack", "Discord", "Email", "Teams"].map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setS4({ ...s4, communication_channel: ch })}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      s4.communication_channel === ch
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Availability" className="mt-4">
              <div className="flex gap-2">
                {(["available", "busy", "away", "dnd"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setS4({ ...s4, availability_status: s })}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                      s4.availability_status === s
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {s === "dnd" ? "Do not disturb" : s}
                  </button>
                ))}
              </div>
            </Field>
            <div className="mt-5 flex items-center justify-between rounded-xl border border-gray-200 bg-white/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Notifications</p>
                <p className="text-xs text-gray-500">Receive updates about approvals, mentions, and tasks.</p>
              </div>
              <button
                onClick={() => setS4({ ...s4, notifications_enabled: !s4.notifications_enabled })}
                className={`relative h-6 w-11 rounded-full transition-colors ${s4.notifications_enabled ? "bg-gray-900" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${s4.notifications_enabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          </StepCard>
        )}

        {/* Step 5: NDA */}
        {step === 4 && (
          <StepCard title="NDA & IP Assignment" subtitle="Review and sign the internal agreement.">
            {s5.signed ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
                <Check className="mx-auto h-10 w-10 text-gray-900" />
                <p className="mt-3 text-sm font-semibold text-gray-900">NDA already signed</p>
                <p className="mt-1 text-xs text-gray-500">You&apos;re all set. Click Continue to finish.</p>
              </div>
            ) : (
              <>
                <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white/60 p-5 text-[13px] leading-relaxed text-gray-600">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">CONFIDENTIALITY & IP ASSIGNMENT AGREEMENT</h3>
                  <p className="mb-2">This Agreement is entered into between the Company (Celeste HQ) and the undersigned individual (&quot;Employee&quot;).</p>
                  <p className="mb-2"><strong>1. Confidentiality.</strong> Employee agrees to hold all proprietary information in strict confidence and shall not disclose, copy, or use any Confidential Information except as required in the performance of their duties.</p>
                  <p className="mb-2"><strong>2. Intellectual Property.</strong> All inventions, discoveries, code, designs, documents, and creative works produced during the course of employment or engagement shall be the sole property of the Company.</p>
                  <p className="mb-2"><strong>3. Return of Materials.</strong> Upon termination, Employee shall return all Company materials, data, and copies thereof.</p>
                  <p className="mb-2"><strong>4. Duration.</strong> This Agreement shall survive termination of the employment or engagement for a period of three (3) years.</p>
                  <p><strong>5. Governing Law.</strong> This Agreement shall be governed by the laws of Italy.</p>
                </div>

                <label className="mt-4 flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={s5.agreed}
                    onChange={(e) => setS5({ ...s5, agreed: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900"
                  />
                  <span className="text-[13px] text-gray-600">
                    I have read and agree to the Confidentiality & IP Assignment Agreement.
                  </span>
                </label>

                <Field label="Type your full legal name" className="mt-4">
                  <input
                    className="input font-signature text-lg"
                    value={s5.typed_name}
                    onChange={(e) => setS5({ ...s5, typed_name: e.target.value })}
                    placeholder="Mattia Vizzi"
                    disabled={!s5.agreed}
                  />
                </Field>
              </>
            )}
          </StepCard>
        )}
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {err && <p className="mt-3 text-center text-xs text-red-600">{err}</p>}

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-5">
        <div>
          {step > 0 && (
            <button onClick={goPrev} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          )}
        </div>
        <button
          onClick={
            step === 0 ? saveStep1 :
            step === 1 ? saveStep2 :
            step === 2 ? saveStep3 :
            step === 3 ? saveStep4 :
            saveStep5
          }
          disabled={
            busy ||
            (step === 0 && !s1.full_name.trim()) ||
            (step === 1 && !departmentId) ||
            (step === 4 && !s5.signed && (!s5.agreed || !s5.typed_name.trim()))
          }
          className="btn-primary disabled:opacity-50"
        >
          {busy ? (
            <Spinner className="h-4 w-4 animate-spin" />
          ) : step === STEP_META.length - 1 ? (
            <>
              <Check className="h-4 w-4" />
              {s5.signed ? "Continue to dashboard" : "Sign & finish"}
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────
function StepCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <p className="mb-5 text-xs text-gray-500">{subtitle}</p>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
        {label} {hint && <span className="font-normal text-gray-400">({hint})</span>}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
