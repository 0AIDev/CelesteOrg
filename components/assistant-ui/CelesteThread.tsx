"use client";

import { AssistantModalPrimitive, ThreadPrimitive, ComposerPrimitive, MessagePrimitive, ActionBarPrimitive, BranchPickerPrimitive } from "@assistant-ui/react";
import { useState, useCallback } from "react";
import { ArrowUp, Copy, Check, RotateCcw, Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Floating action button + chat modal */
export function CelesteAssistantModal() {
  return (
    <AssistantModalPrimitive.Root>
      {/* Ask Celeste button */}
      <AssistantModalPrimitive.Anchor className="fixed bottom-5 right-5 z-50">
        <AssistantModalPrimitive.Trigger asChild>
          <button className="group relative flex h-10 items-center gap-2 rounded-full border border-gray-900 bg-gray-900 px-3.5 text-[13px] font-medium text-white shadow-lg transition-all duration-150 hover:bg-gray-800 active:scale-95">
            <Sparkle className="h-4 w-4" />
            Ask Celeste
          </button>
        </AssistantModalPrimitive.Trigger>
      </AssistantModalPrimitive.Anchor>

      {/* Modal */}
      <AssistantModalPrimitive.Content
        sideOffset={12}
        className="fixed bottom-[68px] right-5 z-50 flex h-[520px] w-[420px] origin-[--radix-popover-content-transform-origin] flex-col overflow-hidden rounded-3xl border border-gray-200/60 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 data-[state=open]:duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2 data-[state=closed]:duration-150 motion-reduce:animate-none"
      >
        <Thread />
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  );
}

/** Full thread */
function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      {/* Messages viewport */}
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-5 pt-6">
        {/* Welcome — only shown when no messages */}
        <ThreadPrimitive.Empty>
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="text-2xl font-medium tracking-tight text-gray-900">
              How can I help you today?
            </h1>
          </div>
        </ThreadPrimitive.Empty>

        {/* Messages list */}
        <ThreadPrimitive.Messages components={{ Message: AssistantMessage }} />
      </ThreadPrimitive.Viewport>

      {/* Footer — composer + suggestions */}
      <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4">
        {/* Composer */}
        <div className="relative flex w-full flex-col">
          <div className="flex w-full cursor-text flex-col gap-2 rounded-2xl border border-gray-200 bg-gray-50/50 p-3 transition-[border-color,background-color] focus-within:border-gray-300 focus-within:bg-white">
            <ComposerPrimitive.Input
              placeholder="Ask Celeste..."
              className="max-h-48 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-[14px] leading-6 text-gray-900 outline-none placeholder:text-gray-400"
              rows={1}
            />
            <div className="relative flex items-center justify-between">
              <button type="button" className="flex size-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200/60 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="M12 5v14" />
                </svg>
              </button>
              <div className="flex items-center gap-1.5">
                <ComposerPrimitive.Send asChild>
                  <button type="button" className="flex size-7 items-center justify-center rounded-full bg-gray-900 p-1 text-white hover:bg-gray-800 disabled:opacity-30 active:scale-90">
                    <ArrowUp className="size-4" />
                  </button>
                </ComposerPrimitive.Send>
              </div>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <SuggestionPill text="What's on my calendar today?" />
          <SuggestionPill text="Show pending approvals" />
          <SuggestionPill text="Summarize recent activity" />
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
}

/** Suggestion pill — sends message when clicked */
function SuggestionPill({ text }: { text: string }) {
  const handleClick = useCallback(() => {
    // Find the composer textarea and set value
    const textarea = document.querySelector('textarea[name="input"]') as HTMLTextAreaElement | null;
    if (!textarea) return;

    // Use native setter to trigger React state
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
    if (nativeSetter) {
      nativeSetter.call(textarea, text);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Submit the form after a short delay
    setTimeout(() => {
      const form = textarea.closest("form");
      if (form) form.requestSubmit();
    }, 100);
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex shrink-0 items-center rounded-full border border-gray-200/60 bg-white px-3.5 py-1.5 text-[13px] text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
    >
      {text}
    </button>
  );
}

/** Message wrapper */
function AssistantMessage(props: Record<string, unknown>) {
  const children = props.children as React.ReactNode;
  return (
    <MessagePrimitive.Root className="group mb-4">
      <div className="text-[14px] leading-relaxed text-gray-900">
        <MessagePrimitive.Parts />
      </div>
      {children}
      <MessageActions />
    </MessagePrimitive.Root>
  );
}

/** Copy / regenerate actions */
function MessageActions() {
  const [copied, setCopied] = useState(false);

  return (
    <MessagePrimitive.If assistant>
      <ActionBarPrimitive.Root className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <ActionBarPrimitive.Copy asChild>
          <button
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }}
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
          <span className="text-[10px] tabular-nums"><BranchPickerPrimitive.Number />/<BranchPickerPrimitive.Count /></span>
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
