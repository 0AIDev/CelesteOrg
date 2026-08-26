"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Spinner,
} from "@phosphor-icons/react";

import {
  createAccount,
  saveOnboardingStep1,
  saveOnboardingStep2,
  saveOnboardingStep3,
  saveOnboardingStep4,
  signNDA,
  completeOnboarding,
} from "@/app/actions/onboarding-actions";

// Steps when NOT logged in (account creation first)
const STEPS_WITH_ACCOUNT = [
  { id: "account", label: "Account" },
  { id: "identity", label: "Profile" },
  { id: "department", label: "Department" },
  { id: "tech", label: "Tech" },
  { id: "preferences", label: "Style" },
  { id: "nda", label: "Agreement" },
];

// Steps when already logged in
const STEPS_WITHOUT_ACCOUNT = [
  { id: "identity", label: "Profile" },
  { id: "department", label: "Department" },
  { id: "tech", label: "Tech" },
  { id: "preferences", label: "Style" },
  { id: "nda", label: "Agreement" },
];

const LANGUAGES = ["TypeScript", "Python", "Rust", "Go", "Java", "C++", "Swift", "Kotlin", "Ruby", "PHP"];
const FRAMEWORKS = ["Next.js", "React", "Vue", "Svelte", "Django", "FastAPI", "Rails", "Express", "NestJS", "Tailwind CSS"];
const MODELS = ["Phi-4-mini", "DeepSeek-R1", "Qwen 2.5", "Llama 3", "Mistral", "Gemma 2", "GPT-4o", "Claude"];

type Department = { id: string; name: string; slug: string };
type OnboardingData = {
  profile: Record<string, unknown> | null;
  techSpecs: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
  hasSignedNDA: boolean;
  departments: Department[];
  user: { id: string; email: string };
} | null;

export function OnboardingClient({ data }: { data: OnboardingData }) {
  const router = useRouter();

  const needsAccount = !data;
  const STEP_META = needsAccount ? STEPS_WITH_ACCOUNT : STEPS_WITHOUT_ACCOUNT;

  const initialStep = (() => {
    if (!data) return 0;
    if (data.hasSignedNDA) return STEP_META.length - 1;
    if (data.preferences) return STEP_META.length - 2;
    if (data.techSpecs) return STEP_META.length - 3;
    if (data.profile?.department_id) return STEP_META.length - 4;
    return 0;
  })();

  const [step, setStep] = useState(initialStep);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  // Account
  const [s0, setS0] = useState({ email: "", password: "", full_name: "" });
  // Profile
  const [s1, setS1] = useState({
    full_name: (data?.profile?.full_name as string) ?? "",
    location: (data?.profile?.location as string) ?? "",
    bio: (data?.profile?.bio as string) ?? "",
  });
  // Department
  const [departmentId, setDepartmentId] = useState((data?.profile?.department_id as string) ?? "");
  // Tech
  const [s3, setS3] = useState({
    primary_language: (data?.techSpecs?.primary_language as string) ?? "",
    frameworks: (data?.techSpecs?.frameworks as string[]) ?? [],
    local_model: (data?.techSpecs?.local_model as string) ?? "",
  });
  // Preferences
  const [s4, setS4] = useState({
    focus_hours: (data?.preferences?.focus_hours as string) ?? "",
    communication_channel: (data?.preferences?.communication_channel as string) ?? "",
    notifications_enabled: (data?.preferences?.notifications_enabled as boolean) ?? true,
  });
  // NDA
  const [s5, setS5] = useState({
    typed_name: "",
    agreed: false,
    signed: data?.hasSignedNDA ?? false,
  });

  const goNext = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setStep((s) => Math.min(s + 1, STEP_META.length - 1));
      setTransitioning(false);
      setErr("");
    }, 150);
  }, [STEP_META.length]);

  const goPrev = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setStep((s) => Math.max(s - 1, 0));
      setTransitioning(false);
      setErr("");
    }, 150);
  }, []);

  async function saveStep0() {
    if (!s0.email.trim() || !s0.password || !s0.full_name.trim()) return;
    setBusy(true);
    setErr("");
    const res = await createAccount({ email: s0.email, password: s0.password, full_name: s0.full_name });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    setS1((prev) => ({ ...prev, full_name: s0.full_name }));
    goNext();
  }

  async function saveStep1() {
    setBusy(true);
    setErr("");
    const res = await saveOnboardingStep1({ full_name: s1.full_name, location: s1.location, bio: s1.bio, previous_companies: [] });
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
    const res = await saveOnboardingStep3({ primary_language: s3.primary_language, frameworks: s3.frameworks, local_model: s3.local_model, hardware_notes: "" });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    goNext();
  }

  async function saveStep4() {
    setBusy(true);
    setErr("");
    const res = await saveOnboardingStep4({ focus_hours: s4.focus_hours, communication_channel: s4.communication_channel, notifications_enabled: s4.notifications_enabled, availability_status: "available" });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    goNext();
  }

  async function saveStep5() {
    if (s5.signed) {
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

  function toggleFramework(fw: string) {
    setS3((p) => ({
      ...p,
      frameworks: p.frameworks.includes(fw) ? p.frameworks.filter((f) => f !== fw) : [...p.frameworks, fw],
    }));
  }

  const getStepIndex = (id: string) => {
    if (needsAccount) return STEPS_WITH_ACCOUNT.findIndex((s) => s.id === id);
    return STEPS_WITHOUT_ACCOUNT.findIndex((s) => s.id === id);
  };

  const currentIdx = needsAccount ? step : step;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="stack w-full max-w-lg" style={{ opacity: transitioning ? 0 : 1, transition: "opacity 150ms" }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="py-5 hstack justify-start w-full">
          <div className="w-full">
            <h5 className="text-left text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
              {step === 0 && needsAccount && "Create your account"}
              {step === 0 && !needsAccount && "Help us personalize your experience"}
              {getStepIndex("identity") === step && "Tell us about yourself"}
              {getStepIndex("department") === step && "Which team are you on?"}
              {getStepIndex("tech") === step && "What's your tech stack?"}
              {getStepIndex("preferences") === step && "How do you like to work?"}
              {getStepIndex("nda") === step && "One last thing"}
            </h5>
          </div>
        </div>

        {/* ── Step Content ───────────────────────────────────────── */}
        <div className="flex min-h-[300px] flex-col items-center">

          {/* Step 0: Account Creation */}
          {needsAccount && step === 0 && (
            <form className="stack items-start justify-start gap-5 w-full" onSubmit={(e) => { e.preventDefault(); saveStep0(); }}>
              <Field label="Full name" required>
                <input className="input" value={s0.full_name} onChange={(e) => setS0({ ...s0, full_name: e.target.value })} placeholder="First name" autoFocus />
              </Field>
              <Field label="Email" required>
                <input className="input" type="email" value={s0.email} onChange={(e) => setS0({ ...s0, email: e.target.value })} placeholder="you@celeste.ai" />
              </Field>
              <Field label="Password" required>
                <input className="input" type="password" value={s0.password} onChange={(e) => setS0({ ...s0, password: e.target.value })} placeholder="At least 8 characters" />
              </Field>
            </form>
          )}

          {/* Step: Profile */}
          {getStepIndex("identity") === step && (
            <div className="stack items-start justify-start gap-5 w-full">
              <Field label="What's your name?">
                <input className="input" value={s1.full_name} onChange={(e) => setS1({ ...s1, full_name: e.target.value })} placeholder="First name" autoFocus />
              </Field>
              <Field label="Where are you based?">
                <input className="input" value={s1.location} onChange={(e) => setS1({ ...s1, location: e.target.value })} placeholder="Milan, Italy" />
              </Field>
              <Field label="Short bio">
                <input className="input" value={s1.bio} onChange={(e) => setS1({ ...s1, bio: e.target.value })} placeholder="What do you do?" />
              </Field>
            </div>
          )}

          {/* Step: Department */}
          {getStepIndex("department") === step && (
            <div className="grid w-full grid-cols-2 sm:grid-cols-3 gap-2">
              {(data?.departments ?? []).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDepartmentId(d.id)}
                  className={`flex h-20 items-center justify-center rounded-2xl border px-4 text-sm font-medium transition-all ${
                    departmentId === d.id
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-900 hover:border-gray-900"
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}

          {/* Step: Tech Stack */}
          {getStepIndex("tech") === step && (
            <div className="stack items-start justify-start gap-5 w-full">
              <Field label="Primary language">
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setS3({ ...s3, primary_language: s3.primary_language === l ? "" : l })}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        s3.primary_language === l
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-900"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Frameworks & tools">
                <div className="flex flex-wrap gap-1.5">
                  {FRAMEWORKS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFramework(f)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        s3.frameworks.includes(f)
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-900"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Preferred model">
                <div className="flex flex-wrap gap-1.5">
                  {MODELS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setS3({ ...s3, local_model: s3.local_model === m ? "" : m })}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        s3.local_model === m
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-900"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {/* Step: Preferences */}
          {getStepIndex("preferences") === step && (
            <div className="stack items-start justify-start gap-5 w-full">
              <Field label="Core focus hours">
                <input className="input" value={s4.focus_hours} onChange={(e) => setS4({ ...s4, focus_hours: e.target.value })} placeholder="e.g. 09:00-12:00, 14:00-17:00" />
              </Field>
              <Field label="Preferred communication">
                <div className="flex gap-2">
                  {["Slack", "Discord", "Email", "Teams"].map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setS4({ ...s4, communication_channel: ch })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        s4.communication_channel === ch
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-900"
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="flex items-center justify-between w-full">
                <div>
                  <p className="text-sm font-medium text-gray-900">Notifications</p>
                  <p className="text-xs text-gray-500">Receive updates about approvals, mentions, and tasks.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setS4({ ...s4, notifications_enabled: !s4.notifications_enabled })}
                  className={`relative h-6 w-11 rounded-full transition-colors ${s4.notifications_enabled ? "bg-gray-900" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${s4.notifications_enabled ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          )}

          {/* Step: NDA */}
          {getStepIndex("nda") === step && (
            <div className="stack items-start justify-start gap-5 w-full">
              {s5.signed ? (
                <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
                  <Check className="mx-auto h-10 w-10 text-gray-900" />
                  <p className="mt-3 text-sm font-semibold text-gray-900">Already signed</p>
                  <p className="mt-1 text-xs text-gray-500">Click Continue to finish.</p>
                </div>
              ) : (
                <>
                  <div className="max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 p-4 text-[12px] leading-relaxed text-gray-500">
                    <p className="mb-2"><strong>Confidentiality & IP Assignment</strong></p>
                    <p className="mb-1">1. You agree to hold all proprietary information in strict confidence.</p>
                    <p className="mb-1">2. All inventions, code, and creative works are property of the Company.</p>
                    <p className="mb-1">3. Upon termination, return all Company materials.</p>
                    <p>4. Governing law: Italy.</p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s5.agreed}
                      onChange={(e) => setS5({ ...s5, agreed: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-[13px] text-gray-600">I have read and agree to the agreement.</span>
                  </label>
                  <Field label="Type your full name">
                    <input
                      className="input"
                      value={s5.typed_name}
                      onChange={(e) => setS5({ ...s5, typed_name: e.target.value })}
                      placeholder="Your name"
                      disabled={!s5.agreed}
                    />
                  </Field>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Error ──────────────────────────────────────────────────── */}
        {err && <p className="mt-3 text-center text-xs text-red-600">{err}</p>}

        {/* ── Navigation buttons ─────────────────────────────────────── */}
        <div className="hstack gap-2 items-center py-6">
          {step > 0 && (
            <button
              type="button"
              onClick={goPrev}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={
              (needsAccount && step === 0) ? saveStep0 :
              (needsAccount && step === 1) || (!needsAccount && step === 0) ? saveStep1 :
              (needsAccount && step === 2) || (!needsAccount && step === 1) ? saveStep2 :
              (needsAccount && step === 3) || (!needsAccount && step === 2) ? saveStep3 :
              (needsAccount && step === 4) || (!needsAccount && step === 3) ? saveStep4 :
              saveStep5
            }
            disabled={
              busy ||
              ((needsAccount && step === 0) && (!s0.full_name.trim() || !s0.email.trim() || s0.password.length < 8)) ||
              ((needsAccount && step === 1 || (!needsAccount && step === 0)) && !s1.full_name.trim()) ||
              ((needsAccount && step === 2 || (!needsAccount && step === 1)) && !departmentId) ||
              (((needsAccount && step === 5) || (!needsAccount && step === 4)) && !s5.signed && (!s5.agreed || !s5.typed_name.trim()))
            }
            className="inline-flex items-center justify-center rounded-[10px] bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? (
              <Spinner className="h-4 w-4 animate-spin" />
            ) : step === STEP_META.length - 1 ? (
              s5.signed ? "Continue" : "Sign & finish"
            ) : (
              "Next"
            )}
          </button>
        </div>
      </div>

      {/* ── Step dots (bottom) ──────────────────────────────────────── */}
      <div className="fixed bottom-8 left-auto right-auto h-4 flex flex-row items-center justify-center w-fit">
        <div className="hstack justify-center items-center">
          {STEP_META.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Step ${s.label}`}
              onClick={() => { if (i <= step) { setTransitioning(true); setTimeout(() => { setStep(i); setTransitioning(false); }, 150); } }}
              disabled={i > step}
              className="group py-1 px-1"
            >
              <div
                className={`h-[6px] rounded-full bg-gray-900 transition-all duration-200 ${
                  i === step ? "w-5 opacity-100" : "w-[6px] opacity-30"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="w-full stack justify-center items-stretch">
      <label className="mb-1">
        <p className="text-sm font-medium text-gray-900">
          {label} {required && <span className="text-gray-400 font-normal">(required)</span>}
        </p>
      </label>
      {children}
    </div>
  );
}
