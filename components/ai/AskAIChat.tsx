"use client";

import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with assistant-ui
const CelesteAssistantModal = dynamic(
  () =>
    import("@/components/assistant-ui/CelesteThread").then(
      (m) => m.CelesteAssistantModal,
    ),
  { ssr: false },
);

export function AskAIChat() {
  return <CelesteAssistantModal />;
}
