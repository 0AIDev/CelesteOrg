"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseActions, executeActions } from "@/lib/ai/agent-actions";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const POSITION_KEY = "celeste-ask-button-position";
const CHAT_STORAGE_KEY = "celeste-chat-history";

/** Load chat history from localStorage */
function loadChatHistory(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Message[];
    return parsed.slice(-50);
  } catch {
    return [];
  }
}

/** Save chat history to localStorage */
function saveChatHistory(messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  } catch { /* ignore */ }
}

/** Floating button + chat modal */
export function CelesteAssistantModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragMoved, setDragMoved] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const [btnRect, setBtnRect] = useState<{ left: number; top: number } | null>(null);

  // Check for ?auto= param to auto-send a message
  const autoParam = searchParams?.get("auto");

  // Load persisted position
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POSITION_KEY);
      if (saved) setPosition(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Save position on change
  useEffect(() => {
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    } catch { /* ignore */ }
  }, [position]);

  // Track button screen position
  useEffect(() => {
    function updateRect() {
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setBtnRect({ left: r.left, top: r.top });
      }
    }
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [position, open]);

  function handleMouseDown(e: React.MouseEvent) {
    setDragMoved(false);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    e.preventDefault();
  }

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(e: MouseEvent) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) setDragMoved(true);
      const newX = Math.max(0, Math.min(window.innerWidth - 140, dragStartRef.current.posX - dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 40, dragStartRef.current.posY - dy));
      setPosition({ x: newX, y: newY });
    }

    function handleMouseUp() {
      setIsDragging(false);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const modalWidth = 420;
  const modalHeight = 520;
  const buttonWidth = 136;
  const gap = 12;

  const btnLeft = btnRect ? btnRect.left : window.innerWidth - position.x - buttonWidth;
  const btnTop = btnRect ? btnRect.top : window.innerHeight - position.y - 40;

  const modalLeft = Math.max(
    16,
    Math.min(btnLeft + buttonWidth / 2 - modalWidth / 2, window.innerWidth - modalWidth - 16),
  );
  const modalTop = Math.max(16, btnTop - modalHeight - gap);

  function handleOpen() {
    if (!dragMoved) setOpen(true);
  }

  return (
    <>
      {/* Ask Celeste button — draggable */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        onMouseDown={handleMouseDown}
        className={cn(
          "fixed z-50 flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 text-[13px] font-medium text-gray-800 shadow-lg transition-shadow duration-150 hover:shadow-xl",
          isDragging ? "cursor-grabbing scale-105" : "cursor-grab active:scale-95",
        )}
        style={{ right: position.x, bottom: position.y }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
        Ask Celeste
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed z-50 flex h-[520px] w-[420px] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in fade-in-0 zoom-in-95 duration-200"
          style={{ left: modalLeft, top: modalTop }}
        >
          <Chat onClose={() => setOpen(false)} router={router} autoSend={autoParam} />
        </div>
      )}
    </>
  );
}

/** Simple chat component with persistence */
function Chat({ onClose, router, autoSend }: { onClose: () => void; router: ReturnType<typeof useRouter>; autoSend?: string | null }) {
  const [messages, setMessages] = useState<Message[]>(() => loadChatHistory());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [reasoningSteps, setReasoningSteps] = useState<string[]>([]);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSentRef = useRef(false);

  // Persist messages whenever they change
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-send from URL param
  useEffect(() => {
    if (autoSend && !autoSentRef.current && !loading) {
      autoSentRef.current = true;
      setTimeout(() => send(autoSend), 500);
    }
  }, [autoSend, loading]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Simulate reasoning steps for UX
    setReasoningOpen(true);
    setReasoningSteps(["Analyzing your request"]);
    setTimeout(() => setReasoningSteps((p) => [...p, "Reading workspace data"]), 800);
    setTimeout(() => setReasoningSteps((p) => [...p, "Preparing response"]), 1600);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Server error ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("3:")) {
              try {
                const content = JSON.parse(line.slice(2));
                assistantContent += content;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    last.content = assistantContent;
                  } else {
                    updated.push({ role: "assistant", content: assistantContent });
                  }
                  return updated;
                });
              } catch {
                // ignore parse errors in streaming
              }
            }
          }
        }
      }

      setReasoningSteps((p) => [...p, "Done"]);
      setTimeout(() => setReasoningOpen(false), 400);

      if (!assistantContent) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I couldn't generate a response. Please try again." },
        ]);
      } else {
        const { cleanText, actions } = parseActions(assistantContent);
        const cleaned = cleanResponse(cleanText);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            last.content = cleaned;
          }
          return updated;
        });
        if (actions.length > 0) {
          executeActions(actions, router);
        }
      }
    } catch (err) {
      setReasoningOpen(false);
      const msg = err instanceof Error && err.name === "AbortError"
        ? "Response timed out — the AI is taking too long. Try again."
        : "Network error — please try again.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: msg },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleSuggestion(text: string) {
    send(text);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Close button — top right, no header */}
      <button
        onClick={onClose}
        className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 pt-10 pb-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-400">How can I help you today?</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {/* Reasoning panel — shows while AI processes */}
            {loading && reasoningOpen && (
              <ReasoningDisplay steps={reasoningSteps} />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Suggestions — only when no messages */}
      {messages.length === 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 px-5 pb-3">
          <SuggestionPill text="What's on my calendar today?" onClick={handleSuggestion} />
          <SuggestionPill text="Show pending approvals" onClick={handleSuggestion} />
          <SuggestionPill text="Summarize recent activity" onClick={handleSuggestion} />
        </div>
      )}

      {/* Input */}
      <div className="px-5 pb-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Celeste..."
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:bg-white transition-colors"
            disabled={loading}
          />
          {input.trim() && (
            <button
              type="submit"
              disabled={loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-30 active:scale-90 transition-all animate-in fade-in duration-150"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

/** Fake reasoning display while AI processes */
function ReasoningDisplay({ steps }: { steps: string[] }) {
  return (
    <div className="flex items-start gap-2 py-1 text-[13px] text-gray-400">
      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500 animate-pulse" />
      <div className="flex flex-col gap-1">
        <span className="font-medium text-gray-500">
          Thinking{steps.length > 0 && ` — ${steps[steps.length - 1]}`}
        </span>
      </div>
    </div>
  );
}

/** Clean thinking process from AI response */
function cleanResponse(text: string): string {
  if (!text) return "";
  let cleaned = text;
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/<thinking[\s\S]*?<\/thinking>/gi, "");
  cleaned = cleaned.replace(/^\s*(?:Here'?s a thinking|Let me|I need to|First,|Analysis:|Step \d|\d+\.\s*(?:Analyze|Deconstruct|Check|Formulate)).*$/gim, "");
  cleaned = cleaned.replace(/Here's a thinking process:[\s\S]*?(?=\n[A-Z])/i, "");
  cleaned = cleaned.replace(/\d+\.\s*\*\*[^*]+\*\*[\s\S]*?(?=\n\d+\.|\n[A-Z]|$)/g, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  return cleaned;
}

/** Message bubble — user gets gray bg, AI is plain */
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const content = isUser ? message.content : cleanResponse(message.content);

  if (!content) return null;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap text-[13px] leading-relaxed",
          isUser
            ? "rounded-2xl rounded-br-md bg-gray-100 px-3.5 py-2.5 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
            : "text-gray-700 dark:text-gray-300",
        )}
      >
        {content}
      </div>
    </div>
  );
}

/** Suggestion pill */
function SuggestionPill({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className="inline-flex shrink-0 items-center rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-[12px] text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900"
    >
      {text}
    </button>
  );
}
