"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Sparkle, Copy, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReasoningPanel } from "@/components/elements/reasoning-panel";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const POSITION_KEY = "celeste-ask-button-position";

/** Floating button + chat modal */
export function CelesteAssistantModal() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragMoved, setDragMoved] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const [btnRect, setBtnRect] = useState<{ left: number; top: number } | null>(null);

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

  // Calculate modal position: centered above the button
  const modalWidth = 420;
  const modalHeight = 520;
  const buttonWidth = 136; // approx
  const gap = 12;

  // Button's left edge on screen (button uses `right: position.x`)
  const btnLeft = btnRect ? btnRect.left : window.innerWidth - position.x - buttonWidth;
  const btnTop = btnRect ? btnRect.top : window.innerHeight - position.y - 40;

  // Center modal above button, clamped to viewport
  const modalLeft = Math.max(
    16,
    Math.min(btnLeft + buttonWidth / 2 - modalWidth / 2, window.innerWidth - modalWidth - 16)
  );
  const modalTop = Math.max(16, btnTop - modalHeight - gap);

  function handleOpen() {
    if (!dragMoved) setOpen(true);
  }

  return (
    <>
      {/* Ask Celeste button — white glassmorphism, draggable */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        onMouseDown={handleMouseDown}
        className={cn(
          "fixed z-50 flex h-10 items-center gap-2 rounded-full border border-white/40 bg-white/70 px-3.5 text-[13px] font-medium text-gray-800 shadow-lg backdrop-blur-xl transition-shadow duration-150 hover:shadow-xl",
          isDragging ? "cursor-grabbing scale-105" : "cursor-grab active:scale-95",
        )}
        style={{ right: position.x, bottom: position.y }}
      >
        <Sparkle className="h-4 w-4 text-gray-600" />
        Ask Celeste
      </button>

      {/* Modal — positioned above button, centered */}
      {open && (
        <div
          className="fixed z-50 flex h-[520px] w-[420px] flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-200"
          style={{ left: modalLeft, top: modalTop }}
        >
          <Chat onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

/** Simple chat component */
function Chat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

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
                // ignore
              }
            }
          }
        }
      }

      if (!assistantContent) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I couldn't generate a response. Please try again." },
        ]);
      } else {
        // Clean the final response
        const cleaned = cleanResponse(assistantContent);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            last.content = cleaned;
          }
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error — please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleSuggestion(text: string) {
    send(text);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <Sparkle className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Ask Celeste</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Sparkle className="h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-600">
              How can I help you today?
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {/* Reasoning panel — shows fake thinking steps while AI processes */}
            {loading && messages[messages.length - 1]?.role !== "assistant" && (
              <ReasoningPanel active={loading} className="py-1" />
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
      <div className="border-t border-gray-200/50 px-5 py-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Celeste..."
            className="flex-1 rounded-xl border border-gray-200/60 bg-white/50 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:bg-white backdrop-blur-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex size-9 items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-30 active:scale-90 transition-all"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

/** Clean thinking process from AI response */
function cleanResponse(text: string): string {
  if (!text) return "";
  let cleaned = text;
  // Strip thinking blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/<thinking[\s\S]*?<\/thinking>/gi, "");
  // Strip lines that look like thinking
  cleaned = cleaned.replace(/^\s*(?:Here'?s a thinking|Let me|I need to|First,|Analysis:|Step \d|\d+\.\s*(?:Analyze|Deconstruct|Check|Formulate)).*$/gim, "");
  // Strip "Here's a thinking process:" blocks
  cleaned = cleaned.replace(/Here's a thinking process:[\s\S]*?(?=\n[A-Z])/i, "");
  // Strip thinking steps
  cleaned = cleaned.replace(/\d+\.\s*\*\*[^*]+\*\*[\s\S]*?(?=\n\d+\.|\n[A-Z]|$)/g, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  return cleaned;
}

/** Message bubble — clean, no background, no avatar */
function MessageBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const content = isUser ? message.content : cleanResponse(message.content);

  function copyToClipboard() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!content) return null;

  return (
    <div className={cn("group", isUser ? "text-right" : "text-left")}>
      <div
        className={cn(
          "inline-block max-w-[85%] whitespace-pre-wrap text-[13px] leading-relaxed",
          isUser ? "text-gray-900" : "text-gray-700",
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      {!isUser && (
        <button
          onClick={copyToClipboard}
          className="mt-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-gray-400 opacity-0 transition-opacity hover:text-gray-600 group-hover:opacity-100"
        >
          {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}

/** Suggestion pill */
function SuggestionPill({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className="inline-flex shrink-0 items-center rounded-full border border-gray-200/60 bg-white/60 px-3.5 py-1.5 text-[12px] text-gray-600 backdrop-blur-sm transition-colors hover:border-gray-300 hover:bg-white hover:text-gray-900"
    >
      {text}
    </button>
  );
}
