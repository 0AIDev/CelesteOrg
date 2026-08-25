"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { InviteModal } from "@/components/teams/InviteModal";
import { MorningModal, EodModal } from "@/components/reports/ReportModals";
import { CommandMenu } from "@/components/ui/CommandMenu";
import { AskAIChat } from "@/components/ai/AskAIChat";

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
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  // Persisted UI state — sidebar and Ask AI panels remember their last state
  // across reloads (localStorage).
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [standupOpen, setStandupOpen] = useState(false);
  const [eodOpen, setEodOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    try {
      const savedSidebar = window.localStorage.getItem("celeste-sidebar-open");
      if (savedSidebar !== null) setSidebarOpen(savedSidebar === "1");
      const savedAi = window.localStorage.getItem("celeste-ai-open");
      if (savedAi !== null) setAiOpen(savedAi === "1");
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

  useEffect(() => {
    try {
      window.localStorage.setItem("celeste-ai-open", aiOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [aiOpen]);

  return (
    <SessionContext.Provider
      value={{ user, refresh: () => setRevision((r) => r + 1) }}
    >
      <div className="flex min-h-screen bg-white">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenInvite={() => setInviteOpen(true)}
          onOpenStandup={() => setStandupOpen(true)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            profile={user}
            sidebarOpen={sidebarOpen}
            toggleSidebar={() => setSidebarOpen((o) => !o)}
            onOpenCmdk={() => setCmdkOpen(true)}
          />
          <main className="flex-1">{children}</main>
        </div>

        {/* Global overlays */}
        <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
        <MorningModal open={standupOpen} onClose={() => setStandupOpen(false)} />
        <EodModal open={eodOpen} onClose={() => setEodOpen(false)} />
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

        {/* Ask AI — right column, pushes the main content when open */}
        <AskAIChat open={aiOpen} onOpenChange={setAiOpen} />
      </div>
    </SessionContext.Provider>
  );
}
