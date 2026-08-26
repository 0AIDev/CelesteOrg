"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, X } from "lucide-react";
import { askAi } from "@/app/actions/ai-assistant";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "ai"; text: string; actions?: string[] };

const SUGGESTIONS = [
  "Who's on vacation today?",
  "What do I need to approve?",
  "Create a meeting tomorrow at 10am called Team Sync",
  "Invite alice@company.com as Head of Marketing",
];

export function AskAIChat({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [msgs, thinking]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || thinking) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setThinking(true);
    const res = await askAi(question);
    setThinking(false);
    setMsgs((m) => [...m, { role: "ai", text: res.ok ? res.answer : res.error, actions: res.ok ? res.actions : undefined }]);
  }

  return (
    <>
      {/* Minimal black floating button — bottom right, hidden while the drawer is open */}
      <button
        onClick={() => onOpenChange(true)}
        aria-label="Ask Celeste"
        className={cn(
          "fixed bottom-5 right-5 z-40 inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-[0.6rem] border border-gray-900 bg-gray-900 px-2.5 text-[13px] font-medium text-white shadow-none transition-colors hover:bg-gray-800 active:bg-gray-950",
          open && "hidden",
        )}
      >
        <svg
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="ml-[-3px] mr-[5px] h-[18px] w-[18px] shrink-0"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          style={{ strokeWidth: 1.5 }}
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.563 2.813h-5.25a2.25 2.25 0 0 0-2.25 2.25v6.375a2.25 2.25 0 0 0 2.25 2.25h2.176a.75.75 0 0 1 .482.175l1.548 1.298a.75.75 0 0 0 .96.003l1.575-1.304a.75.75 0 0 1 .478-.172h2.156a2.25 2.25 0 0 0 2.25-2.25v-2.25"
          />
          <path
            fill="currentColor"
            d="m15.18 3.139-.522-1.359a.437.437 0 0 0-.816 0l-.522 1.359a.75.75 0 0 1-.431.43l-1.359.523a.437.437 0 0 0 0 .816l1.359.522a.75.75 0 0 1 .43.431l.523 1.359a.437.437 0 0 0 .816 0l.522-1.359a.75.75 0 0 1 .431-.43l1.359-.523a.437.437 0 0 0 0-.816l-1.359-.522a.75.75 0 0 1-.43-.431"
          />
        </svg>
        Ask Celeste
      </button>

      {/* In-flow right column — pushes the main content when open */}
      <div
        className={cn(
          "sticky top-0 h-screen shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
          open ? "w-[min(24rem,100vw)]" : "w-0",
        )}
        aria-hidden={!open}
      >
        <div className="m-4 mr-6 flex h-[calc(100vh-2rem)] w-[min(24rem,100vw)] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-xl">
          {/* Header — plain text + close */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Ask Celeste AI</p>
              <p className="text-[11px] text-gray-500">Knows your workspace in real time</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.length === 0 && !thinking && (
              <div className="space-y-2 pt-1">
                <p className="text-[13px] text-gray-500">
                  Hi! Ask me anything about the workspace — calendar, approvals, documents, team.
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-[12.5px] text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-md bg-gray-900 text-white"
                      : "rounded-bl-md border border-gray-100 bg-gray-50 text-gray-800",
                  )}
                >
                  {m.text}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2 border-t border-gray-200 pt-2">
                      {m.actions.map((a, i) => (
                        <p key={i} className="text-[12px] text-green-700">{a}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-gray-100 bg-gray-50 px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  <span className="text-[12px] text-gray-400">Thinking…</span>
                </div>
              </div>
            )}
          </div>

          {/* Input — send arrow appears inside only while typing */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="relative border-t border-gray-100 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Celeste…"
              className="input h-9 w-full pr-10 text-[13px]"
            />
            {input.trim().length > 0 && (
              <button
                type="submit"
                disabled={thinking}
                className="absolute right-[1.15rem] top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
                aria-label="Send"
              >
                {thinking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
