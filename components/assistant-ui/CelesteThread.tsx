"use client";

import {
  AssistantModalPrimitive,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ActionBarPrimitive,
  BranchPickerPrimitive,
} from "@assistant-ui/react";
import { useState } from "react";
import {
  ArrowUp,
  Copy,
  Check,
  RotateCcw,
  Sparkle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Floating action button that opens the chat modal */
export function CelesteAssistantModal() {
  return (
    <AssistantModalPrimitive.Root>
      <AssistantModalPrimitive.Anchor className="fixed bottom-5 right-5 z-50">
        <AssistantModalPrimitive.Trigger asChild>
          <button className="group relative flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium text-white transition-all duration-200 active:scale-95">
            {/* Animated gradient border */}
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_var(--angle),transparent_25%,gray-400_50%,gray-600_75%,transparent_100%)] opacity-60 [animation:spin-border_4s_linear_infinite] group-hover:opacity-100" />
            {/* Inner fill */}
            <span className="absolute inset-[1.5px] rounded-full bg-gray-900" />
            {/* Content */}
            <span className="relative z-10 flex items-center gap-1.5">
              <Sparkle className="h-4 w-4" />
              Ask Celeste
            </span>
          </button>
        </AssistantModalPrimitive.Trigger>
      </AssistantModalPrimitive.Anchor>

      <AssistantModalPrimitive.Content
        sideOffset={16}
        className="fixed bottom-20 right-5 z-50 flex h-[520px] w-[400px] origin-[--radix-popover-content-transform-origin] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 data-[state=open]:duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2 data-[state=closed]:duration-150 motion-reduce:animate-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900">
              <Sparkle className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">Celeste AI</p>
              <p className="text-[11px] text-gray-500">Workspace copilot</p>
            </div>
          </div>
        </div>

        {/* Thread */}
        <Thread />
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  );
}

/** Full thread with messages, suggestions, and composer */
function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      {/* Messages area */}
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        <ThreadPrimitive.Empty>
          <EmptyState />
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages components={{ Message: AssistantMessage }} />
      </ThreadPrimitive.Viewport>

      {/* Composer */}
      <div className="border-t border-gray-100 p-3">
        <Composer />
      </div>
    </ThreadPrimitive.Root>
  );
}

/** Empty state with suggestions */
function EmptyState() {
  const suggestions = [
    "What's on my calendar today?",
    "Show me pending approvals",
    "Summarize recent GitHub activity",
    "Who's out of office this week?",
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 pb-8">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
        <Sparkle className="h-5 w-5 text-gray-600" />
      </div>
      <p className="mb-1 text-[13px] font-medium text-gray-900">Ask Celeste anything</p>
      <p className="mb-5 text-center text-[12px] text-gray-500">
        I know your workspace — calendar, approvals, documents, team, and more.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[12px] text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-100"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Message wrapper with actions */
function AssistantMessage(props: Record<string, unknown>) {
  const children = props.children as React.ReactNode;
  return (
    <MessagePrimitive.Root className="group mb-4">
      {children}
      <MessageActions />
    </MessagePrimitive.Root>
  );
}

/** Action bar that appears on hover */
function MessageActions() {
  const [copied, setCopied] = useState(false);

  return (
    <MessagePrimitive.If assistant>
      <ActionBarPrimitive.Root className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <ActionBarPrimitive.Copy asChild>
          <button
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Reload asChild>
          <button className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </ActionBarPrimitive.Reload>
        <BranchPickerPrimitive.Root className="ml-1 flex items-center gap-0.5 text-gray-400">
          <BranchPickerPrimitive.Previous asChild>
            <button className="rounded-md p-1 hover:bg-gray-100 hover:text-gray-600">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 3L4.5 6L7.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </BranchPickerPrimitive.Previous>
          <span className="text-[10px] tabular-nums">
            <BranchPickerPrimitive.Number />/<BranchPickerPrimitive.Count />
          </span>
          <BranchPickerPrimitive.Next asChild>
            <button className="rounded-md p-1 hover:bg-gray-100 hover:text-gray-600">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </BranchPickerPrimitive.Next>
        </BranchPickerPrimitive.Root>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.If>
  );
}

/** Composer with send button */
function Composer() {
  return (
    <ComposerPrimitive.Root className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 transition-colors focus-within:border-gray-300 focus-within:bg-white">
      <ComposerPrimitive.Input
        placeholder="Ask Celeste…"
        className="flex-1 bg-transparent px-2 py-1.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
        rows={1}
      />
      <ComposerPrimitive.Send asChild>
        <button className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-800 disabled:opacity-40">
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
}
