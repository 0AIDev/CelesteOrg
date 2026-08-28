"use client";

import { Suspense, createContext, lazy, useContext, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AIProvider } from "@/components/ai/AIProvider";
import { GlobalDMListener } from "@/components/notifications/GlobalDMListener";

// Lazy-load heavy overlays — they only render when opened, so defer until needed.
const InviteModal = lazy(() => import("@/components/teams/InviteModal").then(m => ({ default: m.InviteModal })));
const MorningModal = lazy(() => import("@/components/reports/ReportModals").then(m => ({ default: m.MorningModal })));
const EodModal = lazy(() => import("@/components/reports/ReportModals").then(m => ({ default: m.EodModal })));
const CommandMenu = lazy(() => import("@/components/ui/CommandMenu").then(m => ({ default: m.CommandMenu })));
const AskAIChat = lazy(() => import("@/components/ai/AskAIChat").then(m => ({ default: m.AskAIChat })));
const FeedbackModal = lazy(() => import("@/components/feedback/FeedbackModal").then(m => ({ default: m.FeedbackModal })));

type SessionUser = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  departmentName?: string | null;
};

const SessionContext = createContext<{ user: SessionUser | null; refresh: () => void }>({
  user: null,
  refresh: () => {},
});

export const useSession = () => useContext(SessionContext);

export function LayoutProvider({
  user,
  canManage,
  isOnboarded,
  onboardingMode = false,
  children,
}: {
  user: SessionUser | null;
  canManage?: boolean;
  isOnboarded?: boolean;
  onboardingMode?: boolean;
  children: React.ReactNode;
}) {
  // Persisted UI state — sidebar and Ask AI panels remember their last state
  // across reloads (localStorage).
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [standupOpen, setStandupOpen] = useState(false);
  const [eodOpen, setEodOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [revision, setRevision] = useState(0);


  useEffect(() => {
    try {
      const savedSidebar = window.localStorage.getItem("celeste-sidebar-open");
      if (savedSidebar !== null) setSidebarOpen(savedSidebar === "1");
    } catch {
      /* localStorage unavailable — keep defaults */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("celeste-sidebar-open", sidebarOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [sidebarOpen]);

  return (
    <SessionContext.Provider
      value={{ user, refresh: () => setRevision((r) => r + 1) }}
    >
    <AIProvider>
    <Suspense fallback={<div className="flex min-h-screen bg-white"><div className="flex min-w-0 flex-1 flex-col"><main className="flex-1">{children}</main></div></div>}>
      <div className="flex min-h-screen bg-white">
        {!onboardingMode && (
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onOpenInvite={canManage ? () => setInviteOpen(true) : undefined}
            onOpenStandup={() => setStandupOpen(true)}
            isOnboarded={isOnboarded}
            canManage={canManage}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {!onboardingMode && (
            <Header
              profile={user}
              sidebarOpen={sidebarOpen}
              toggleSidebar={() => setSidebarOpen((o) => !o)}
              onOpenCmdk={() => setCmdkOpen(true)}
              onOpenFeedback={() => setFeedbackOpen(true)}
            />
          )}
          <main className="flex-1">{children}</main>
        </div>

        {/* Global overlays — the invite modal is only reachable by founders/admins */}
        <Suspense fallback={null}>
          {canManage && inviteOpen && <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />}
          {standupOpen && <MorningModal open={standupOpen} onClose={() => setStandupOpen(false)} />}
          {eodOpen && <EodModal open={eodOpen} onClose={() => setEodOpen(false)} />}
          <CommandMenu
            open={cmdkOpen}
            onOpenChange={setCmdkOpen}
            onOpenStandup={() => {
              setStandupOpen(true);
            }}
            onOpenEod={() => {
              setEodOpen(true);
            }}
          />
        </Suspense>

        {/* Global DM notification listener — always mounted */}
        {user?.id && <GlobalDMListener userId={user.id} />}

        {/* Ask AI — floating modal, lazy-loaded */}
        <Suspense fallback={null}>
          <AskAIChat />
        </Suspense>

        {/* Feedback widget — lazy-loaded */}
        <Suspense fallback={null}>
          {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
        </Suspense>
      </div>
    </Suspense>
    </AIProvider>
    </SessionContext.Provider>
  );
}
