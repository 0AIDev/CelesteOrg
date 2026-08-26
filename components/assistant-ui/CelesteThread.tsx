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
  Plus,
  Mic,
  ChevronDown,
  Clipboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Floating action button + chat modal — exact replica of the reference design */
export function CelesteAssistantModal() {
  return (
    <AssistantModalPrimitive.Root>
      {/* Floating trigger — dark circle with chevron */}
      <AssistantModalPrimitive.Anchor className="fixed bottom-5 right-5 z-50">
        <AssistantModalPrimitive.Trigger asChild>
          <button className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition-all duration-200 hover:bg-gray-800 active:scale-95">
            <ChevronDown className="h-5 w-5" />
          </button>
        </AssistantModalPrimitive.Trigger>
      </AssistantModalPrimitive.Anchor>

      {/* Modal popover */}
      <AssistantModalPrimitive.Content
        sideOffset={16}
        className="fixed bottom-20 right-5 z-50 flex h-[480px] w-[380px] origin-[--radix-popover-content-transform-origin] flex-col overflow-hidden rounded-3xl border border-gray-200/60 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 data-[state=open]:duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2 data-[state=closed]:duration-150 motion-reduce:animate-none"
      >
        <Thread />
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  );
}

/** Full thread — heading, messages, suggestions, composer */
function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      {/* Messages viewport */}
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-6 pt-8 pb-2">
        <ThreadPrimitive.Empty>
          <EmptyState />
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages components={{ Message: AssistantMessage }} />
      </ThreadPrimitive.Viewport>

      {/* Composer area — at bottom */}
      <div className="border-t border-gray-100 px-4 pb-4 pt-3">
        <Composer />
      </div>
    </ThreadPrimitive.Root>
  );
}

/** Empty state — heading + suggestions (matching screenshot exactly) */
function EmptyState() {
  const suggestions = [
    "What's the weather in San Francisco?",
    "Explain React hooks like useState and useEffect",
    "Show a live dashboard with the present tool",
  ];

  return (
    <div className="flex flex-col">
      {/* Main heading */}
      <h2 className="mb-6 text-[22px] font-semibold text-gray-900">
        How can I help you today?
      </h2>

      {/* Suggestion pills */}
      <div className="flex flex-col gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-left text-[13px] text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Message wrapper with hover actions */
function AssistantMessage(props: Record<string, unknown>) {
  const children = props.children as React.ReactNode;
  return (
    <MessagePrimitive.Root className="group mb-4">
      {children}
      <MessageActions />
    </MessagePrimitive.Root>
  );
}

/** Copy / regenerate actions on hover */
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
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
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
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M7.5 3L4.5 6L7.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </BranchPickerPrimitive.Previous>
          <span className="text-[10px] tabular-nums">
            <BranchPickerPrimitive.Number />/<BranchPickerPrimitive.Count />
          </span>
          <BranchPickerPrimitive.Next asChild>
            <button className="rounded-md p-1 hover:bg-gray-100 hover:text-gray-600">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </BranchPickerPrimitive.Next>
        </BranchPickerPrimitive.Root>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.If>
  );
}

/** Composer — input bar with + button, mic, and send (matching screenshot) */
function Composer() {
  return (
    <div className="flex flex-col gap-3">
      {/* Input row */}
      <ComposerPrimitive.Root className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 transition-colors focus-within:border-gray-300 focus-within:shadow-sm">
        {/* Plus button — left */}
        <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
          <Plus className="h-4 w-4" />
        </button>

        {/* Text input */}
        <ComposerPrimitive.Input
          placeholder="Send a message..."
          className="flex-1 bg-transparent px-1 py-1 text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
          rows={1}
        />

        {/* Mic button */}
        <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
          <Mic className="h-4 w-4" />
        </button>

        {/* Send button — dark circle with arrow */}
        <ComposerPrimitive.Send asChild>
          <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-800 disabled:opacity-30">
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>

      {/* Bottom bar — clipboard icon left, subtle */}
      <div className="flex items-center px-1">
        <button className="flex h-6 w-6 items-center justify-center rounded text-gray-300 transition-colors hover:text-gray-500">
          <Clipboard className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
