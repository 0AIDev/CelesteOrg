"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Spinner } from "@phosphor-icons/react";

import {
  createAccount,
  saveOnboardingStep1,
  saveOnboardingStep2,
  saveOnboardingStep3,
  saveOnboardingStep4,
  signNDA,
  completeOnboarding,
} from "@/app/actions/onboarding-actions";

// ── Step definitions ──────────────────────────────────────────────────────
const STEPS_WITH_ACCOUNT = [
  { id: "welcome", label: "Welcome" },
  { id: "account", label: "Account" },
  { id: "identity", label: "Profile" },
  { id: "role", label: "Role" },
  { id: "team", label: "Team" },
  { id: "goals", label: "Goals" },
  { id: "culture", label: "Culture" },
  { id: "tools", label: "Tools" },
  { id: "tech", label: "Tech" },
  { id: "preferences", label: "Style" },
  { id: "nda", label: "Agreement" },
];

const STEPS_WITHOUT_ACCOUNT = [
  { id: "welcome", label: "Welcome" },
  { id: "identity", label: "Profile" },
  { id: "role", label: "Role" },
  { id: "team", label: "Team" },
  { id: "goals", label: "Goals" },
  { id: "culture", label: "Culture" },
  { id: "tools", label: "Tools" },
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
    return 0;
  })();

  const [step, setStep] = useState(initialStep);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  // Form state
  const [s0, setS0] = useState({ email: "", password: "", full_name: "" });
  const [s1, setS1] = useState({
    full_name: (data?.profile?.full_name as string) ?? "",
    location: (data?.profile?.location as string) ?? "",
    bio: (data?.profile?.bio as string) ?? "",
    phone: "",
  });
  const [departmentId, setDepartmentId] = useState((data?.profile?.department_id as string) ?? "");
  const [roleTitle, setRoleTitle] = useState((data?.profile?.role_title as string) ?? "");
  const [reportsTo, setReportsTo] = useState("");
  const [s3, setS3] = useState({
    primary_language: (data?.techSpecs?.primary_language as string) ?? "",
    frameworks: (data?.techSpecs?.frameworks as string[]) ?? [],
    local_model: (data?.techSpecs?.local_model as string) ?? "",
  });
  const [s4, setS4] = useState({
    focus_hours: (data?.preferences?.focus_hours as string) ?? "",
    communication_channel: (data?.preferences?.communication_channel as string) ?? "",
    notifications_enabled: (data?.preferences?.notifications_enabled as boolean) ?? true,
  });
  const [s5, setS5] = useState({ typed_name: "", agreed: false, signed: data?.hasSignedNDA ?? false });

  // Team goals
  const [goals, setGoals] = useState({
    first_week: "",
    first_30_days: "",
    first_90_days: "",
    key_people_to_meet: "",
    projects_of_interest: "",
  });

  // Tool access
  const [toolsAccess, setToolsAccess] = useState<string[]>([]);

  const goNext = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setStep((s) => Math.min(s + 1, STEP_META.length - 1));
      setTransitioning(false);
      setErr("");
    }, 150);
  }, [STEP_META.length]);

  // Auto-advance informational steps after 2.5 seconds
  const autoAdvanceSteps = ["welcome", "team", "goals", "culture", "tools"];
  useEffect(() => {
    const currentStepId = STEP_META[step]?.id;
    if (autoAdvanceSteps.includes(currentStepId) && !busy) {
      const timer = setTimeout(() => goNext(), 2500);
      return () => clearTimeout(timer);
    }
  }, [step, busy]);

  const goPrev = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setStep((s) => Math.max(s - 1, 0));
      setTransitioning(false);
      setErr("");
    }, 150);
  }, []);

  // ── Save handlers ─────────────────────────────────────────────────────
  async function saveAccount() {
    if (!s0.email.trim() || !s0.password || !s0.full_name.trim()) return;
    setBusy(true); setErr("");
    const res = await createAccount({ email: s0.email, password: s0.password, full_name: s0.full_name });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    setS1((prev) => ({ ...prev, full_name: s0.full_name }));
    goNext();
  }

  async function saveProfile() {
    setBusy(true); setErr("");
    const res = await saveOnboardingStep1({ full_name: s1.full_name, location: s1.location, bio: s1.bio, previous_companies: [] });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    goNext();
  }

  async function saveRole() {
    setBusy(true); setErr("");
    if (departmentId) {
      const res = await saveOnboardingStep2({ department_id: departmentId });
      if (!res.ok) { setBusy(false); setErr(res.error); return; }
    }
    setBusy(false);
    goNext();
  }

  async function saveTech() {
    setBusy(true); setErr("");
    const res = await saveOnboardingStep3({ primary_language: s3.primary_language, frameworks: s3.frameworks, local_model: s3.local_model, hardware_notes: "" });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    goNext();
  }

  async function savePreferences() {
    setBusy(true); setErr("");
    const res = await saveOnboardingStep4({ focus_hours: s4.focus_hours, communication_channel: s4.communication_channel, notifications_enabled: s4.notifications_enabled, availability_status: "available" });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    goNext();
  }

  async function saveNDA() {
    if (s5.signed) {
      const cRes = await completeOnboarding();
      if (cRes.ok) router.push("/dashboard");
      return;
    }
    setBusy(true); setErr("");
    const res = await signNDA({ typed_name: s5.typed_name, agreed: s5.agreed });
    if (!res.ok) { setBusy(false); setErr(res.error); return; }
    const cRes = await completeOnboarding();
    setBusy(false);
    if (!cRes.ok) { setErr(cRes.error); return; }
    router.push("/dashboard");
  }

  function toggleFramework(fw: string) {
    setS3((p) => ({ ...p, frameworks: p.frameworks.includes(fw) ? p.frameworks.filter((f) => f !== fw) : [...p.frameworks, fw] }));
  }

  function toggleTool(tool: string) {
    setToolsAccess((prev) => prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]);
  }

  const idx = (id: string) => STEP_META.findIndex((s) => s.id === id);
  const isAccountStep = (id: string) => needsAccount && step === idx(id);
  const isNormalStep = (id: string) => step === idx(id);

  const stepActions: Record<string, () => void> = {
    welcome: goNext,
    account: saveAccount,
    identity: saveProfile,
    role: saveRole,
    team: goNext,
    goals: goNext,
    culture: goNext,
    tools: goNext,
    tech: saveTech,
    preferences: savePreferences,
    nda: saveNDA,
  };

  function getNextAction() {
    const currentStepId = STEP_META[step]?.id;
    return stepActions[currentStepId] ?? goNext;
  }

  function isNextDisabled() {
    const currentStepId = STEP_META[step]?.id;
    if (busy) return true;
    if (currentStepId === "account" && needsAccount) return !s0.full_name.trim() || !s0.email.trim() || s0.password.length < 8;
    if (currentStepId === "identity") return !s1.full_name.trim();
    if (currentStepId === "nda" && !s5.signed) return !s5.agreed || !s5.typed_name.trim();
    return false;
  }

  const isLast = step === STEP_META.length - 1;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white">
      <div className="stack w-full max-w-lg px-6" style={{ opacity: transitioning ? 0 : 1, transition: "opacity 150ms" }}>

        {/* Header */}
        <div className="py-5 w-full text-center">
          <h5 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
            {isAccountStep("welcome") && "Welcome to Celeste"}
            {isAccountStep("account") && "Create your account"}
            {isNormalStep("welcome") && "Welcome to Celeste"}
            {isNormalStep("identity") && "Tell us about yourself"}
            {isNormalStep("role") && "What's your role?"}
            {isNormalStep("team") && "Your team"}
            {isNormalStep("goals") && "Your goals"}
            {isNormalStep("culture") && "How we work"}
            {isNormalStep("tools") && "Tools & access"}
            {isNormalStep("tech") && "Your tech stack"}
            {isNormalStep("preferences") && "Work style"}
            {isNormalStep("nda") && "One last thing"}
          </h5>
          <p className="mt-2 text-sm text-gray-500">
            {isAccountStep("welcome") && "Set up your workspace in a few steps."}
            {isAccountStep("account") && "Choose your email and password."}
            {isNormalStep("welcome") && "Let's get you set up with the team."}
            {isNormalStep("identity") && "This appears on your profile and org chart."}
            {isNormalStep("role") && "Select your department and position."}
            {isNormalStep("team") && "Know who you'll work with."}
            {isNormalStep("goals") && "Set expectations for your first 90 days."}
            {isNormalStep("culture") && "Understand how the team operates."}
            {isNormalStep("tools") && "Choose the tools you use daily."}
            {isNormalStep("tech") && "Help us personalize your experience."}
            {isNormalStep("preferences") && "When and how you like to work."}
            {isNormalStep("nda") && "Review and sign the agreement."}
          </p>
        </div>

        {/* Step Content */}
        <div className="flex min-h-[320px] flex-col">

          {/* ═══════════ Welcome ═══════════ */}
          {(isAccountStep("welcome") || isNormalStep("welcome")) && (
            <div className="space-y-4">
              <InfoBlock title="What is Celeste HQ?" items={[
                "Your internal company workspace — everything in one place.",
                "Org chart, calendar, documents, approvals, chat, and AI.",
                "Built for fast-moving teams who want to stay aligned.",
              ]} />
              <InfoBlock title="What you'll set up" items={[
                "Your profile and role in the organization",
                "Access to the tools you'll use daily",
                "Your tech stack and work preferences",
                "Company agreements and policies",
              ]} />
              <InfoBlock title="Need help?" items={[
                "Use ⌘K (Ctrl+K) anywhere to search anything",
                "Click 'Ask Celeste' (bottom-right) for AI assistance",
                "Your manager and team are here to help",
              ]} />
            </div>
          )}

          {/* ═══════════ Account ═══════════ */}
          {isAccountStep("account") && (
            <form className="stack items-start justify-start gap-5 w-full" onSubmit={(e) => { e.preventDefault(); saveAccount(); }}>
              <Field label="Full name" required>
                <input className="input" value={s0.full_name} onChange={(e) => setS0({ ...s0, full_name: e.target.value })} placeholder="First and last name" autoFocus />
              </Field>
              <Field label="Work email" required>
                <input className="input" type="email" value={s0.email} onChange={(e) => setS0({ ...s0, email: e.target.value })} placeholder="you@company.com" />
              </Field>
              <Field label="Password" required>
                <input className="input" type="password" value={s0.password} onChange={(e) => setS0({ ...s0, password: e.target.value })} placeholder="At least 8 characters" />
              </Field>
            </form>
          )}

          {/* ═══════════ Profile ═══════════ */}
          {isNormalStep("identity") && (
            <div className="space-y-4">
              <Field label="Full name" required>
                <input className="input" value={s1.full_name} onChange={(e) => setS1({ ...s1, full_name: e.target.value })} placeholder="First and last name" autoFocus />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Location">
                  <input className="input" value={s1.location} onChange={(e) => setS1({ ...s1, location: e.target.value })} placeholder="City, Country" />
                </Field>
                <Field label="Phone">
                  <input className="input" type="tel" value={s1.phone} onChange={(e) => setS1({ ...s1, phone: e.target.value })} placeholder="+39 ..." />
                </Field>
              </div>
              <Field label="Short bio">
                <textarea className="input resize-none" rows={2} value={s1.bio} onChange={(e) => setS1({ ...s1, bio: e.target.value })} placeholder="What do you do? What are you excited about?" />
              </Field>
            </div>
          )}

          {/* ═══════════ Role ═══════════ */}
          {isNormalStep("role") && (
            <div className="space-y-4">
              <Field label="Department">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(data?.departments ?? []).map((d) => (
                    <button key={d.id} type="button" onClick={() => setDepartmentId(d.id)}
                      className={`flex h-14 items-center justify-center rounded-xl border px-3 text-[13px] font-medium transition-all ${departmentId === d.id ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-gray-900"}`}>
                      {d.name}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Role title">
                <input className="input" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="e.g. Software Engineer, Product Designer" />
              </Field>
              <Field label="Reports to (manager)">
                <input className="input" value={reportsTo} onChange={(e) => setReportsTo(e.target.value)} placeholder="Manager's name" />
                <p className="mt-1 text-[11px] text-gray-400">Your manager can be updated later in Settings.</p>
              </Field>
            </div>
          )}

          {/* ═══════════ Team ═══════════ */}
          {isNormalStep("team") && (
            <div className="space-y-4">
              <InfoBlock title="How the team is structured" items={[
                "Every person has a role in the Org Chart — see who reports to whom",
                "Your direct manager is assigned by the CEO or department head",
                "Message anyone directly from their profile in the Org Chart",
              ]} />
              <InfoBlock title="Channels you'll join" items={[
                "#general — Company-wide announcements",
                "#engineering — Technical discussions",
                "#random — Non-work conversations",
                "Your department channel — Team-specific",
              ]} />
              <InfoBlock title="Your first week" items={[
                "Introduce yourself in #general",
                "Schedule 1:1s with your manager and key teammates",
                "Review the Org Chart to understand the structure",
                "Set up your profile so others can find you",
              ]} />
            </div>
          )}

          {/* ═══════════ Goals ═══════════ */}
          {isNormalStep("goals") && (
            <div className="space-y-4">
              <Field label="What do you want to achieve in your first week?">
                <textarea className="input resize-none" rows={2} value={goals.first_week} onChange={(e) => setGoals({ ...goals, first_week: e.target.value })} placeholder="e.g. Set up dev environment, meet the team, understand the codebase" />
              </Field>
              <Field label="Goals for the first 30 days">
                <textarea className="input resize-none" rows={2} value={goals.first_30_days} onChange={(e) => setGoals({ ...goals, first_30_days: e.target.value })} placeholder="e.g. Ship first feature, understand architecture, build relationships" />
              </Field>
              <Field label="Goals for the first 90 days">
                <textarea className="input resize-none" rows={2} value={goals.first_90_days} onChange={(e) => setGoals({ ...goals, first_90_days: e.target.value })} placeholder="e.g. Own a feature end-to-end, mentor new hires, improve processes" />
              </Field>
              <Field label="Key people to meet">
                <input className="input" value={goals.key_people_to_meet} onChange={(e) => setGoals({ ...goals, key_people_to_meet: e.target.value })} placeholder="e.g. CTO, Head of Design, Lead Engineer" />
              </Field>
              <Field label="Projects of interest">
                <input className="input" value={goals.projects_of_interest} onChange={(e) => setGoals({ ...goals, projects_of_interest: e.target.value })} placeholder="e.g. AI assistant, mobile app, infrastructure" />
              </Field>
            </div>
          )}

          {/* ═══════════ Culture ═══════════ */}
          {isNormalStep("culture") && (
            <div className="space-y-4">
              <InfoBlock title="Our values" items={[
                "Ship fast, iterate faster — done is better than perfect",
                "Default to transparency — share context, not conclusions",
                "Own your work — take initiative, be accountable",
                "Question everything — challenge assumptions",
              ]} />
              <InfoBlock title="How we communicate" items={[
                "Async-first: write it down before scheduling a meeting",
                "Direct feedback: honest, kind, specific",
                "No status meetings — use daily standups and EOD reports",
                "Calendar is sacred: respect focus hours",
              ]} />
              <InfoBlock title="Decision making" items={[
                "DACI framework: Driver, Approver, Contributors, Informed",
                "Anyone can propose a change — use the Ideas feature",
                "Disagree and commit — once decided, move forward",
              ]} />
            </div>
          )}

          {/* ═══════════ Tools ═══════════ */}
          {isNormalStep("tools") && (
            <div className="space-y-4">
              <InfoBlock title="Tools you'll have access to" items={[
                "GitHub — Code, PRs, and CI/CD",
                "Supabase — Database, auth, storage",
                "Vercel — Deployments and hosting",
                "Slack / Discord — Communication",
              ]} />
              <Field label="Which tools do you use daily?">
                <div className="flex flex-wrap gap-1.5">
                  {["GitHub", "VS Code", "Figma", "Linear", "Notion", "Slack", "Discord", "Vercel", "Supabase", "Docker"].map((tool) => (
                    <button key={tool} type="button" onClick={() => toggleTool(tool)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${toolsAccess.includes(tool) ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-gray-900"}`}>
                      {tool}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {/* ═══════════ Tech ═══════════ */}
          {isNormalStep("tech") && (
            <div className="space-y-4">
              <Field label="Primary language">
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map((l) => (
                    <button key={l} type="button" onClick={() => setS3({ ...s3, primary_language: s3.primary_language === l ? "" : l })}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${s3.primary_language === l ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-gray-900"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Frameworks & tools">
                <div className="flex flex-wrap gap-1.5">
                  {FRAMEWORKS.map((f) => (
                    <button key={f} type="button" onClick={() => toggleFramework(f)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${s3.frameworks.includes(f) ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-gray-900"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Preferred AI model">
                <div className="flex flex-wrap gap-1.5">
                  {MODELS.map((m) => (
                    <button key={m} type="button" onClick={() => setS3({ ...s3, local_model: s3.local_model === m ? "" : m })}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${s3.local_model === m ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-gray-900"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {/* ═══════════ Preferences ═══════════ */}
          {isNormalStep("preferences") && (
            <div className="space-y-4">
              <Field label="Core focus hours">
                <input className="input" value={s4.focus_hours} onChange={(e) => setS4({ ...s4, focus_hours: e.target.value })} placeholder="e.g. 09:00-12:00, 14:00-17:00" />
                <p className="mt-1 text-[11px] text-gray-400">When are you most productive? Teammates will see this.</p>
              </Field>
              <Field label="Preferred communication">
                <div className="flex flex-wrap gap-2">
                  {["Slack", "Discord", "Email", "Teams", "In-app chat"].map((ch) => (
                    <button key={ch} type="button" onClick={() => setS4({ ...s4, communication_channel: ch })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${s4.communication_channel === ch ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-gray-900"}`}>
                      {ch}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="flex items-center justify-between w-full rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Notifications</p>
                  <p className="text-xs text-gray-500">Approvals, mentions, task updates, calendar reminders.</p>
                </div>
                <button type="button" onClick={() => setS4({ ...s4, notifications_enabled: !s4.notifications_enabled })}
                  className={`relative h-6 w-11 rounded-full transition-colors ${s4.notifications_enabled ? "bg-gray-900" : "bg-gray-200"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${s4.notifications_enabled ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ NDA ═══════════ */}
          {isNormalStep("nda") && (
            <div className="space-y-4">
              {s5.signed ? (
                <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
                  <Check className="mx-auto h-10 w-10 text-gray-900" />
                  <p className="mt-3 text-sm font-semibold text-gray-900">Already signed</p>
                  <p className="mt-1 text-xs text-gray-500">Click Continue to finish.</p>
                </div>
              ) : (
                <>
                  <div className="max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 p-4 text-[12px] leading-relaxed text-gray-500">
                    <p className="mb-2 text-[13px] font-semibold text-gray-900">CONFIDENTIALITY & IP ASSIGNMENT</p>
                    <p className="mb-1"><strong>1. Confidentiality.</strong> Hold all proprietary information in strict confidence.</p>
                    <p className="mb-1"><strong>2. Intellectual Property.</strong> All inventions, code, and creative works are property of the Company.</p>
                    <p className="mb-1"><strong>3. Return of Materials.</strong> Upon termination, return all Company materials.</p>
                    <p className="mb-1"><strong>4. Duration.</strong> Survives termination for 3 years.</p>
                    <p><strong>5. Governing Law.</strong> Laws of Italy.</p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={s5.agreed} onChange={(e) => setS5({ ...s5, agreed: e.target.checked })} className="mt-0.5 h-4 w-4 rounded border-gray-300" />
                    <span className="text-[13px] text-gray-600">I have read and agree to the Confidentiality & IP Assignment Agreement.</span>
                  </label>
                  <Field label="Type your full legal name">
                    <input className="input" value={s5.typed_name} onChange={(e) => setS5({ ...s5, typed_name: e.target.value })} placeholder="Your full legal name" disabled={!s5.agreed} />
                  </Field>
                </>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {err && <p className="mt-3 text-center text-xs text-red-600">{err}</p>}

        {/* Navigation — minimal, right-aligned */}
        <div className="flex items-center justify-end gap-3 py-6">
          {step > 0 && (
            <button type="button" onClick={goPrev}
              className="text-[13px] font-medium text-gray-400 hover:text-gray-700 transition-colors">
              Back
            </button>
          )}
          <button
            type="button"
            onClick={getNextAction()}
            disabled={isNextDisabled()}
            className="inline-flex items-center justify-center rounded-[10px] bg-gray-900 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Spinner className="h-4 w-4 animate-spin" /> : isLast ? (s5.signed ? "Continue to dashboard" : "Sign & finish") : "Next"}
          </button>
        </div>
      </div>

      {/* Step dots */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center">
        <div className="flex items-center gap-1">
          {STEP_META.map((s, i) => (
            <button key={s.id} type="button" aria-label={`Step ${s.label}`}
              onClick={() => { if (i <= step) { setTransitioning(true); setTimeout(() => { setStep(i); setTransitioning(false); }, 150); } }}
              disabled={i > step} className="py-1 px-1">
              <div className={`h-[6px] rounded-full bg-gray-900 transition-all duration-200 ${i === step ? "w-5 opacity-100" : "w-[6px] opacity-30"}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="w-full">
      <label className="mb-1.5 block">
        <p className="text-sm font-medium text-gray-900">
          {label} {required && <span className="text-gray-400 font-normal">(required)</span>}
        </p>
      </label>
      {children}
    </div>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
      <p className="mb-2 text-[13px] font-medium text-gray-900">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[12px] text-gray-500 leading-relaxed">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
