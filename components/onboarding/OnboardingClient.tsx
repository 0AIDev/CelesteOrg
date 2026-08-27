"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Spinner, House, TreeStructure, CalendarBlank, ChatsCircle, Command, Sparkle, Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Logo } from "@/components/ui/Logo";

import {
  createAccount,
  saveOnboardingStep1,
  saveOnboardingStep2,
  saveOnboardingStep3,
  saveOnboardingStep4,
  signNDA,
  completeOnboarding,
  getOnboardingData,
} from "@/app/actions/onboarding-actions";
import { acceptInvite, getInviteEmail } from "@/app/actions/invite-actions";

// ── Step definitions ──────────────────────────────────────────────────────
const STEPS_WITH_ACCOUNT = [
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
  { id: "account", label: "Create Account" },
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

// Tool icons — real SVGs for each service
const toolList = [
  { name: "GitHub", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg> },
  { name: "VS Code", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M17.583 2.421L11.993 7.19l-2.002-1.863L7.99 3.764 2.417 6.33v11.34l5.573 2.566 1.997-1.563 2.006 1.864 5.59 2.579 3.583-1.645V4.066l-3.583-1.645zM8.5 16.594V7.406l4.5 4.594-4.5 4.594z"/></svg> },
  { name: "Figma", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M8.5 2.5a3 3 0 00-3 3v3a3 3 0 003 3h3v-3a3 3 0 00-3-3h-3zm0 9a3 3 0 00-3 3v3a3 3 0 003 3h3v-3a3 3 0 00-3-3h-3zm9-9a3 3 0 00-3 3v3a3 3 0 003 3h3v-6a3 3 0 00-3-3h-3zm-3 3a3 3 0 013 3v3h-3a3 3 0 01-3-3V6a3 3 0 013-3z"/></svg> },
  { name: "Linear", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M3.89 17.612l5.388-14.09a.75.75 0 011.41.136l2.08 7.744 3.338-4.498a.75.75 0 011.2.884l-2.592 5.29a.75.75 0 01-.67.405H6.63a.75.75 0 01-.72-.538.75.75 0 01.018-.418l.062-.126h-.002l-.003.003-.417-.062a.75.75 0 00-.844.49l-.23.583a.75.75 0 01-.844.49l-.418-.063-.003.003.003-.005-.003.004-.002.001-.001.001-.002.002-.005.008-.014.018-.053.067-.175.207a.75.75 0 01-.538.22z"/></svg> },
  { name: "Notion", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.2 2.16c-.42-.326-.98-.7-2.055-.607l-12.8.934c-.466.047-.56.28-.374.466l1.99 1.184zM19.97 5.997c0 .185-.14.372-.373.372h-.047l-13.03.747c-.56.047-.84-.186-.654-.42l.886-1.138c.186-.233.607-.28 1.073-.233l11.584-.654c.28 0 .56.14.56.326l.003.537zM6.814 8.363c0-.232.186-.419.42-.419h13.136c.233 0 .42.187.42.419v.14c0 .233-.187.42-.42.42H7.234c-.233 0-.42-.187-.42-.42v-.14zM19.55 9.5c.233 0 .42.186.42.419v.14c0 .233-.187.42-.42.42H15.2c-.233 0-.42-.187-.42-.42v-.14c0-.233.187-.42.42-.42h4.35zm-12.72 2.126c.233 0 .42.186.42.42v.14c0 .233-.187.42-.42.42H4.83c-.233 0-.42-.187-.42-.42v-.14c0-.233.187-.42.42-.42h2zm0 3.52c.233 0 .42.186.42.42v.14c0 .233-.187.42-.42.42H4.83c-.233 0-.42-.187-.42-.42v-.14c0-.233.187-.42.42-.42h2zm0 3.52c.233 0 .42.186.42.42v.14c0 .233-.187.42-.42.42H4.83c-.233 0-.42-.187-.42-.42v-.14c0-.233.187-.42.42-.42h2z"/></svg> },
  { name: "Slack", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/></svg> },
  { name: "Discord", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg> },
  { name: "Vercel", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 1L24 22H0L12 1z"/></svg> },
  { name: "Supabase", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M13.7.5l-7.2 2.8a.5.5 0 00-.3.38l-.9 5.4a.5.5 0 00.22.52l4.7 3.1 1.4-2.1a.5.5 0 01.58-.17l3.3 1.5c.33.15.53.47.53.83v6.8a.5.5 0 01-.21.41l-8.3 5.8a.5.5 0 01-.72-.15L.8 13.9a.5.5 0 01.05-.6l5.8-4.7a.5.5 0 01.72.12l1.4 2.1 4.7-3.1a.5.5 0 01.72.12l2.4 5.8a.5.5 0 00.47.29h6.4a.5.5 0 00.47-.32l2.2-6a.5.5 0 00-.24-.53L14.1.9a.5.5 0 00-.4-.4z"/></svg> },
  { name: "Docker", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.186.186 0 00-.185.186v1.887c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.186.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.186.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.186.186 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.186.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.186v1.887c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.186v1.887c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.186.186 0 00-.185-.186H5.136a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.186v1.887c0 .102.082.185.185.185M2.346 1.038l7.822 3.347a.5.5 0 01.302.379l1.323 5.814a.5.5 0 01-.14.453L8.27 14.034a.5.5 0 01-.692.058L1.46 11.66a.5.5 0 01-.186-.384V1.476a.5.5 0 01.295-.458l.277-.126"/></svg> },
];

type Department = { id: string; name: string; slug: string };
type OnboardingData = {
  profile: Record<string, unknown> | null;
  techSpecs: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
  hasSignedNDA: boolean;
  departments: Department[];
  user: { id: string; email: string };
} | null;

// Client wrapper — fetches profile data + invited email after render so the
// server page never blocks on Supabase (no more 504s). Guests see the
// account-creation flow; logged-in users get their profile prefilled.
export function OnboardingClient({
  data: serverData,
  inviteToken,
  inviteEmail: serverEmail,
}: {
  data: OnboardingData;
  inviteToken?: string | null;
  inviteEmail?: string | null;
}) {
  const [data, setData] = useState<OnboardingData>(serverData);
  const [inviteEmail, setInviteEmail] = useState<string | null>(serverEmail ?? null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [d, email] = await Promise.all([
          getOnboardingData(),
          inviteToken ? getInviteEmail(inviteToken) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (email) setInviteEmail(email);
        if (d) setData(d);
      } catch {
        // Stay in guest mode — the wizard still works.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  // Remount when the mode changes (guest → logged-in, or email arrives) so
  // form state re-initializes with the freshly fetched values.
  const wizardKey = data
    ? `auth-${data.user.id}`
    : `guest-${inviteEmail ?? "no-email"}`;

  return (
    <OnboardingWizard
      key={wizardKey}
      data={data}
      inviteToken={inviteToken}
      inviteEmail={inviteEmail}
    />
  );
}

function OnboardingWizard({ data, inviteToken, inviteEmail }: { data: OnboardingData; inviteToken?: string | null; inviteEmail?: string | null }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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

  // Form state — pre-fill email from invite if available
  const [s0, setS0] = useState({ email: inviteEmail ?? "", password: "", confirmPassword: "", full_name: "" });
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
  const [goals, setGoals] = useState({ first_week: "", first_30_days: "", first_90_days: "", key_people_to_meet: "", projects_of_interest: "" });
  const [toolsAccess, setToolsAccess] = useState<string[]>([]);

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



  // ── Save handlers ─────────────────────────────────────────────────────
  async function saveAccount() {
    if (!s0.email.trim() || !s0.password || !s0.full_name.trim()) return;
    if (s0.password !== s0.confirmPassword) { setErr("Passwords don't match"); return; }
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
      if (cRes.ok) {
        if (inviteToken) await acceptInvite({ token: inviteToken }).catch(() => {});
        router.push("/dashboard");
      }
      return;
    }
    setBusy(true); setErr("");
    const res = await signNDA({ typed_name: s5.typed_name, agreed: s5.agreed });
    if (!res.ok) { setBusy(false); setErr(res.error); return; }
    const cRes = await completeOnboarding();
    if (cRes.ok && inviteToken) await acceptInvite({ token: inviteToken }).catch(() => {});
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
    welcome: goNext, account: saveAccount, identity: saveProfile, role: saveRole,
    team: goNext, goals: goNext, culture: goNext, tools: goNext,
    tech: saveTech, preferences: savePreferences, nda: saveNDA,
  };

  function getNextAction() { return stepActions[STEP_META[step]?.id] ?? goNext; }

  function isNextDisabled() {
    const id = STEP_META[step]?.id;
    if (busy) return true;
    // Account step (last) — all fields required
    if (id === "account" && needsAccount) return !s0.full_name.trim() || !s0.email.trim() || s0.password.length < 8 || s0.password !== s0.confirmPassword;
    // Profile step — name required
    if (id === "identity") return !s1.full_name.trim();
    // Role step — department required
    if (id === "role") return !departmentId;
    // Goals step — at least first week goal required
    if (id === "goals") return !goals.first_week.trim();
    // Tools step — at least one tool required
    if (id === "tools") return toolsAccess.length === 0;
    // Tech step — language required
    if (id === "tech") return !s3.primary_language;
    // Preferences step — communication required
    if (id === "preferences") return !s4.communication_channel;
    // NDA step — agreement + typed name required
    if (id === "nda" && !s5.signed) return !s5.agreed || !s5.typed_name.trim();
    return false;
  }

  // Account step is now last — check if it's the last step
  const isAccountLast = needsAccount && step === STEP_META.length - 1;

  const isLast = step === STEP_META.length - 1;
  // For account step at the end, show "Create account & finish"

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-white dark:bg-[#0F0F0F]">
      {/* Dark mode toggle */}
      <button
        onClick={toggleTheme}
        className="absolute right-5 top-5 flex h-9 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#161616] dark:text-gray-300 dark:hover:bg-[rgba(255,255,255,0.06)]"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {theme === "dark" ? "Light" : "Dark"}
      </button>
      <div className="w-full max-w-3xl px-6" style={{ opacity: transitioning ? 0 : 1, transition: "opacity 150ms" }}>
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <Logo className="h-8 w-auto" />
        </div>

        {/* ── Title ─────────────────────────────────────────────────── */}
        <div className="py-4 pb-3 sm:pb-5 w-full">
          <h5 className="text-xl md:text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">
            {isAccountStep("welcome") && (s0.full_name ? `${s0.full_name.split(" ")[0]}, welcome to Celeste HQ` : "Welcome to Celeste HQ")}
            {isAccountStep("account") && "Set your password"}
            {isNormalStep("welcome") && (s1.full_name ? `${s1.full_name.split(" ")[0]}, welcome to Celeste HQ` : "Welcome to Celeste HQ")}
            {isNormalStep("identity") && "Tell us about yourself"}
            {isNormalStep("role") && "What's your role?"}
            {isNormalStep("team") && "Your team awaits"}
            {isNormalStep("goals") && "Set your goals"}
            {isNormalStep("culture") && "How we work"}
            {isNormalStep("tools") && "Tools & access"}
            {isNormalStep("tech") && "Your tech stack"}
            {isNormalStep("preferences") && "Work style"}
            {isNormalStep("nda") && "One last thing"}
          </h5>
        </div>

        {/* ── Content ───────────────────────────────────────────────── */}
        <div className="flex min-h-[280px] flex-col justify-center">

          {/* ═══════════ Welcome ═══════════ */}
          {(isAccountStep("welcome") || isNormalStep("welcome")) && (
            <div className="space-y-3">
              {[
                { icon: <TreeStructure weight="bold" className="h-4 w-4" />, title: "Org Chart", desc: "See the full team structure, who reports to whom, and message anyone directly." },
                { icon: <CalendarBlank weight="bold" className="h-4 w-4" />, title: "Calendar", desc: "View and create events, schedule meetings, and see team availability." },
                { icon: <ChatsCircle weight="bold" className="h-4 w-4" />, title: "Chat", desc: "Direct messages and channel-based team communication in real time." },
                { icon: <Check weight="bold" className="h-4 w-4" />, title: "Approvals", desc: "Review and approve requests from the team — documents, expenses, and more." },
                { icon: <House weight="bold" className="h-4 w-4" />, title: "Documents", desc: "Share, sign, and manage company documents in one place." },
                { icon: <Sparkle weight="bold" className="h-4 w-4" />, title: "AI Assistant", desc: "Ask Celeste anything about the workspace — calendar, approvals, team, and more." },
                { icon: <Command weight="bold" className="h-4 w-4" />, title: "Quick Actions", desc: "Press ⌘K anywhere to search, navigate, or run commands instantly." },
              ].map((item, i) => (
                <div
                  key={i}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:border-[rgba(255,255,255,0.08)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 shrink-0">{item.icon}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</span>
                  </div>
                  <p className="mt-1 ml-7 text-[13px] text-gray-500 leading-relaxed dark:text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* ═══════════ Account ═══════════ */}
          {isAccountStep("account") && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveAccount(); }}>
              <Field label="Full name" required>
                <input className="input" value={s0.full_name} onChange={(e) => setS0({ ...s0, full_name: e.target.value })} placeholder="First and last name" autoFocus />
              </Field>
              <Field label="Email" required>
                <input
                  className="input bg-gray-50 cursor-not-allowed dark:bg-[rgba(255,255,255,0.03)]"
                  type="email"
                  value={s0.email}
                  readOnly
                  tabIndex={-1}
                />
                <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">This is the email you were invited with.</p>
              </Field>
              <Field label="Password" required>
                <input className="input" type="password" value={s0.password} onChange={(e) => setS0({ ...s0, password: e.target.value })} placeholder="At least 8 characters" autoFocus />
              </Field>
              <Field label="Confirm password" required>
                <input className="input" type="password" value={s0.confirmPassword} onChange={(e) => setS0({ ...s0, confirmPassword: e.target.value })} placeholder="Repeat your password" />
                {s0.confirmPassword && s0.password !== s0.confirmPassword && (
                  <p className="mt-1 text-[11px] text-red-500">Passwords don't match</p>
                )}
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
                <textarea className="input resize-none" rows={2} value={s1.bio} onChange={(e) => setS1({ ...s1, bio: e.target.value })} placeholder="What do you do?" />
              </Field>
            </div>
          )}

          {/* ═══════════ Role — card grid ═══════════ */}
          {isNormalStep("role") && (
            <div className="space-y-4">
              <Field label="Department" required>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {(data?.departments ?? []).map((d) => (
                    <button key={d.id} type="button" onClick={() => setDepartmentId(d.id)}
                      className={`flex h-18 sm:h-[5.5rem] items-center gap-3 rounded-2xl border px-4 text-left transition-all ${departmentId === d.id ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-900"}`}>
                      <span className="text-gray-400 text-lg">◈</span>
                      <span className="text-sm font-medium text-gray-900">{d.name}</span>
                    </button>
                  ))}
                </div>
                {!departmentId && <p className="mt-1.5 text-[11px] text-red-500">Select a department to continue</p>}
              </Field>
              <Field label="Role title">
                <input className="input" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="e.g. Software Engineer" />
              </Field>
              <Field label="Reports to">
                <input className="input" value={reportsTo} onChange={(e) => setReportsTo(e.target.value)} placeholder="Manager's name" />
              </Field>
            </div>
          )}

          {/* ═══════════ Team ═══════════ */}
          {isNormalStep("team") && (
            <div className="space-y-4">
              {[
                { icon: <TreeStructure weight="bold" className="h-4 w-4" />, text: "Every person has a role in the Org Chart — see who reports to whom" },
                { icon: <Check weight="bold" className="h-4 w-4" />, text: "Your direct manager is assigned by the CEO or department head" },
                { icon: <ChatsCircle weight="bold" className="h-4 w-4" />, text: "Message anyone directly from their profile in the Org Chart" },
                { icon: <House weight="bold" className="h-4 w-4" />, text: "Join #general, #engineering, and your department channel" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 transition-colors hover:border-gray-900 dark:border-[rgba(255,255,255,0.08)] dark:hover:border-[rgba(255,255,255,0.2)]">
                  <span className="text-gray-400">{item.icon}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* ═══════════ Goals ═══════════ */}
          {isNormalStep("goals") && (
            <div className="space-y-4">
              <Field label="Goals for the first week" required>
                <textarea className="input resize-none" rows={2} value={goals.first_week} onChange={(e) => setGoals({ ...goals, first_week: e.target.value })} placeholder="e.g. Set up dev environment, meet the team" />
                {!goals.first_week.trim() && <p className="mt-1.5 text-[11px] text-red-500">At least one goal is required</p>}
              </Field>
              <Field label="Goals for the first 30 days">
                <textarea className="input resize-none" rows={2} value={goals.first_30_days} onChange={(e) => setGoals({ ...goals, first_30_days: e.target.value })} placeholder="e.g. Ship first feature, understand architecture" />
              </Field>
              <Field label="Goals for the first 90 days">
                <textarea className="input resize-none" rows={2} value={goals.first_90_days} onChange={(e) => setGoals({ ...goals, first_90_days: e.target.value })} placeholder="e.g. Own a feature end-to-end, mentor new hires" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Key people to meet">
                  <input className="input" value={goals.key_people_to_meet} onChange={(e) => setGoals({ ...goals, key_people_to_meet: e.target.value })} placeholder="CTO, Head of Design..." />
                </Field>
                <Field label="Projects of interest">
                  <input className="input" value={goals.projects_of_interest} onChange={(e) => setGoals({ ...goals, projects_of_interest: e.target.value })} placeholder="AI, mobile, infra..." />
                </Field>
              </div>
            </div>
          )}

          {/* ═══════════ Culture ═══════════ */}
          {isNormalStep("culture") && (
            <div className="space-y-4">
              {[
                { icon: <Sparkle weight="bold" className="h-4 w-4" />, text: "Ship fast, iterate faster — done is better than perfect" },
                { icon: <House weight="bold" className="h-4 w-4" />, text: "Default to transparency — share context, not conclusions" },
                { icon: <Check weight="bold" className="h-4 w-4" />, text: "Own your work — take initiative, be accountable" },
                { icon: <CalendarBlank weight="bold" className="h-4 w-4" />, text: "Async-first: write it down before scheduling a meeting" },
                { icon: <TreeStructure weight="bold" className="h-4 w-4" />, text: "DACI framework: Driver, Approver, Contributors, Informed" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 transition-colors hover:border-gray-900 dark:border-[rgba(255,255,255,0.08)] dark:hover:border-[rgba(255,255,255,0.2)]">
                  <span className="text-gray-400">{item.icon}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* ═══════════ Tools ═══════════ */}
          {isNormalStep("tools") && (
            <div className="space-y-4">
              <Field label="Which tools do you use daily?" required>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {toolList.map((tool) => (
                    <button key={tool.name} type="button" onClick={() => toggleTool(tool.name)}
                      className={`flex h-14 items-center gap-3 rounded-2xl border px-4 text-left transition-all ${toolsAccess.includes(tool.name) ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-900"}`}>
                      <span className="text-gray-500 shrink-0 h-4 w-4 flex items-center justify-center">{tool.icon}</span>
                      <span className="text-sm font-medium text-gray-900">{tool.name}</span>
                    </button>
                  ))}
                </div>
                {toolsAccess.length === 0 && <p className="mt-1.5 text-[11px] text-red-500">Select at least one tool to continue</p>}
              </Field>
            </div>
          )}

          {/* ═══════════ Tech ═══════════ */}
          {isNormalStep("tech") && (
            <div className="space-y-4">
              <Field label="Primary language">
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((l) => (
                    <button key={l} type="button" onClick={() => setS3({ ...s3, primary_language: s3.primary_language === l ? "" : l })}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${s3.primary_language === l ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-700 hover:border-gray-900"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Frameworks & tools">
                <div className="flex flex-wrap gap-2">
                  {FRAMEWORKS.map((f) => (
                    <button key={f} type="button" onClick={() => toggleFramework(f)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${s3.frameworks.includes(f) ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-700 hover:border-gray-900"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Preferred AI model">
                <div className="flex flex-wrap gap-2">
                  {MODELS.map((m) => (
                    <button key={m} type="button" onClick={() => setS3({ ...s3, local_model: s3.local_model === m ? "" : m })}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${s3.local_model === m ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-700 hover:border-gray-900"}`}>
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
              </Field>
              <Field label="Preferred communication">
                <div className="flex flex-wrap gap-2">
                  {["Slack", "Discord", "Email", "Teams", "In-app"].map((ch) => (
                    <button key={ch} type="button" onClick={() => setS4({ ...s4, communication_channel: ch })}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${s4.communication_channel === ch ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-700 hover:border-gray-900"}`}>
                      {ch}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 dark:border-[rgba(255,255,255,0.08)]">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Notifications</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Approvals, mentions, task updates.</p>
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
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
                  <Check className="mx-auto h-10 w-10 text-gray-900" />
                  <p className="mt-3 text-sm font-semibold text-gray-900">Already signed</p>
                  <p className="mt-1 text-xs text-gray-500">Click Continue to finish.</p>
                </div>
              ) : (
                <>
                  <div className="max-h-48 overflow-y-auto rounded-2xl border border-gray-200 p-4 text-[12px] leading-relaxed text-gray-500">
                    <p className="mb-2 text-[13px] font-semibold text-gray-900">CONFIDENTIALITY & IP ASSIGNMENT</p>
                    <p className="mb-1"><strong>1.</strong> Hold all proprietary information in strict confidence.</p>
                    <p className="mb-1"><strong>2.</strong> All inventions, code, and creative works are property of the Company.</p>
                    <p className="mb-1"><strong>3.</strong> Upon termination, return all Company materials.</p>
                    <p><strong>4.</strong> Survives termination for 3 years. Governed by laws of Italy.</p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={s5.agreed} onChange={(e) => setS5({ ...s5, agreed: e.target.checked })} className="mt-0.5 h-4 w-4 rounded border-gray-300" />
                    <span className="text-[13px] text-gray-600">I have read and agree to the agreement.</span>
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

        {/* ── Navigation: Back left, Next button right ─────────────── */}
        <div className="flex items-center justify-between py-6">
          <div>
            {step > 0 && (
              <button type="button" onClick={goPrev}
                className="text-[13px] font-medium text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                Back
              </button>
            )}
          </div>
          <button type="button" onClick={getNextAction()} disabled={isNextDisabled()}
            className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-[13px] font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed dark:border-[rgba(255,255,255,0.1)] dark:bg-white dark:text-black dark:hover:bg-gray-200">
            {busy ? "Saving…" : isAccountLast ? "Create account & sign in" : isLast ? (s5.signed ? "Continue" : "Sign & finish") : "Next"}
          </button>
        </div>
      </div>

      {/* ── Step dots — centered at bottom ──────────────────────────── */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center">
        <div className="flex items-center gap-1">
          {STEP_META.map((s, i) => (
            <button key={s.id} type="button" aria-label={`Step ${s.label}`}
              onClick={() => { if (i <= step) { setTransitioning(true); setTimeout(() => { setStep(i); setTransitioning(false); }, 150); } }}
              disabled={i > step} className="py-1 px-1">
              <div className={`h-[6px] rounded-full bg-gray-950 dark:bg-white transition-all duration-200 ${i === step ? "w-5 opacity-100" : "w-[6px] opacity-30"}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Field component ─────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="w-full">
      <label className="mb-1.5 block">
        <p className="text-sm text-foreground font-medium">
          {label} {required && <span className="text-gray-400 font-normal">(required)</span>}
        </p>
      </label>
      {children}
    </div>
  );
}
