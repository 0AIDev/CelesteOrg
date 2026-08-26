"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Sparkle, Copy, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

/** Floating button + chat modal */
export function CelesteAssistantModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Ask Celeste button — white glassmorphism */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-10 items-center gap-2 rounded-full border border-white/40 bg-white/70 px-3.5 text-[13px] font-medium text-gray-800 shadow-lg backdrop-blur-xl transition-all duration-150 hover:bg-white/90 hover:shadow-xl active:scale-95"
      >
        <Sparkle className="h-4 w-4 text-gray-600" />
        Ask Celeste
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed bottom-[68px] right-5 z-50 flex h-[520px] w-[420px] flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200">
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
            {loading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex items-center gap-2 text-gray-400">
                <span className="size-1.5 animate-pulse rounded-full bg-blue-500" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Suggestions */}
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

/** Message bubble */
function MessageBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  function copyToClipboard() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn("group flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          isUser ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600",
        )}
      >
        {isUser ? "You" : "AI"}
      </div>
      <div className={cn("max-w-[80%]", isUser && "text-right")}>
        <div
          className={cn(
            "whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
            isUser
              ? "rounded-br-md bg-gray-900 text-white"
              : "rounded-bl-md border border-gray-100 bg-white text-gray-800 shadow-sm",
          )}
          dangerouslySetInnerHTML={{ __html: message.content }}
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
