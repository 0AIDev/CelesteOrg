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

/** Floating action button + chat modal */
export function CelesteAssistantModal() {
  return (
    <AssistantModalPrimitive.Root>
      {/* Ask Celeste button — attached to modal */}
      <AssistantModalPrimitive.Anchor className="fixed bottom-5 right-5 z-50">
        <AssistantModalPrimitive.Trigger asChild>
          <button className="group relative flex h-10 items-center gap-2 rounded-full border border-gray-900 bg-gray-900 px-3.5 text-[13px] font-medium text-white shadow-lg transition-all duration-150 hover:bg-gray-800 active:scale-95">
            <Sparkle className="h-4 w-4" />
            Ask Celeste
          </button>
        </AssistantModalPrimitive.Trigger>
      </AssistantModalPrimitive.Anchor>

      {/* Modal — directly above the button */}
      <AssistantModalPrimitive.Content
        sideOffset={12}
        className="fixed bottom-[68px] right-5 z-50 flex h-[520px] w-[420px] origin-[--radix-popover-content-transform-origin] flex-col overflow-hidden rounded-3xl border border-gray-200/60 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 data-[state=open]:duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2 data-[state=closed]:duration-150 motion-reduce:animate-none"
      >
        <Thread />
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  );
}

/** Full thread — exact replica of assistant-ui layout */
function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      {/* Messages viewport */}
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col px-4 pt-4">
        {/* Welcome */}
        <ThreadPrimitive.Empty>
          <div className="mb-6 flex flex-col items-center px-4 text-center">
            <h1 className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-2xl font-medium tracking-tight duration-200">
              How can I help you today?
            </h1>
          </div>
        </ThreadPrimitive.Empty>

        {/* Messages */}
        <div className="mb-14 flex flex-col gap-y-6 empty:hidden">
          <ThreadPrimitive.Messages components={{ Message: AssistantMessage }} />
        </div>
      </ThreadPrimitive.Viewport>

      {/* Footer — composer + suggestions */}
      <div className="flex flex-col gap-4 overflow-visible bg-white pb-4 md:pb-6">
        {/* Composer */}
        <form className="relative flex w-full flex-col">
          <div className="flex w-full cursor-text flex-col gap-2 rounded-[18px] border border-gray-200/60 bg-white p-3 transition-[border-color] focus-within:border-gray-300">
            {/* Attachments */}
            <div className="flex w-full flex-row items-center gap-2 overflow-x-auto empty:hidden" />

            {/* Input */}
            <ComposerPrimitive.Input
              placeholder="Send a message..."
              className="max-h-48 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base leading-6 text-gray-900 outline-none placeholder:text-gray-400/60"
              rows={1}
            />

            {/* Action row */}
            <div className="relative flex items-center justify-between">
              {/* Plus button */}
              <button
                type="button"
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:scale-[0.96]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
              </button>

              {/* Right side — mic + send */}
              <div className="flex items-center gap-1.5">
                {/* Mic */}
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:scale-90"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19v3" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <rect x="9" y="2" width="6" height="13" rx="3" />
                  </svg>
                </button>

                {/* Send */}
                <ComposerPrimitive.Send asChild>
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-full bg-gray-900 p-1 text-white transition-colors hover:bg-gray-800 disabled:opacity-30 active:scale-90"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                </ComposerPrimitive.Send>
              </div>
            </div>
          </div>
        </form>

        {/* Welcome suggestions */}
        <div className="flex w-full flex-wrap items-center justify-center gap-2 px-4">
          <SuggestionPill text1="What's the weather" text2="in San Francisco?" />
          <SuggestionPill text1="Explain React hooks" text2="like useState and useEffect" />
          <SuggestionPill text1="Show a live dashboard" text2="with the present tool" />
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
}

/** Suggestion pill — matches assistant-ui welcome suggestions */
function SuggestionPill({ text1, text2 }: { text1: string; text2: string }) {
  return (
    <div className="fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200">
      <button
        type="button"
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-gray-200/60 bg-white px-3.5 py-1.5 text-sm font-normal text-gray-900 transition-colors hover:bg-gray-50 hover:text-gray-900"
      >
        <span>{text1}</span>
        {text2 && <span className="ml-1 text-gray-500">{text2}</span>}
      </button>
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
