"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Square, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

/**
 * Assistant — a self-contained chat component for Ask Celeste AI.
 * Uses Groq backend via /api/chat with streaming.
 */
export function Assistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || isStreaming) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    setStreamingText("");

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
      if (!reader) throw new Error("No reader");

      let fullText = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          // UIMessageStream format: "0:\"text\"" for text deltas
          if (line.startsWith("0:")) {
            try {
              const parsed = JSON.parse(line.slice(2));
              if (typeof parsed === "string") {
                fullText += parsed;
                setStreamingText(fullText);
              }
            } catch {
              // Fallback: treat as raw text
              const raw = line.slice(2);
              fullText += raw;
              setStreamingText(fullText);
            }
          }
        }
      }

      // Finalize message
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: fullText },
      ]);
      setStreamingText("");
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
      setStreamingText("");
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 pt-4">
        {messages.length === 0 && !isStreaming && (
          <div className="mb-6">
            <p className="text-[13px] leading-relaxed text-gray-500">
              Hi! Ask me anything about the workspace — calendar, approvals, documents, team.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Streaming message */}
          {isStreaming && streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-gray-100 bg-gray-50 px-3.5 py-2.5">
                <StreamingContent text={streamingText} />
              </div>
            </div>
          )}

          {/* Thinking indicator */}
          {isStreaming && !streamingText && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-2 text-[12px] text-gray-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                  <span>Thinking…</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 transition-colors focus-within:border-gray-300 focus-within:bg-white">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
            placeholder="Ask Celeste…"
            className="flex-1 bg-transparent px-2 py-1.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              onClick={() => abortRef.current?.abort()}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => send(input)}
              disabled={!input.trim()}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-40 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gray-100 px-3.5 py-2.5 dark:bg-gray-800">
          <p className="text-[13px] leading-relaxed text-gray-800 whitespace-pre-wrap dark:text-gray-100">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex justify-start">
      <div className="max-w-[85%]">
        <div className="text-[13px] leading-relaxed text-gray-700 whitespace-pre-wrap dark:text-gray-300">
          {message.content}
        </div>
        <button
          onClick={copy}
          className="mt-2 rounded p-1 text-gray-300 opacity-0 transition-opacity hover:text-gray-600 group-hover:opacity-100"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

function StreamingContent({ text }: { text: string }) {
  const words = text.split(" ");
  const totalWords = words.length;

  return (
    <div className="text-[13px] leading-relaxed text-gray-800">
      {words.map((word, i) => {
        const isFresh = totalWords - 1 - i < 2;
        return (
          <span
            key={i}
            className="inline-block animate-[fadeIn_0.5s_ease-out_both]"
          >
            <span
              className={cn(
                "transition-colors duration-700",
                isFresh && "text-blue-500",
              )}
            >
              {word}
            </span>{" "}
          </span>
        );
      })}
      <span
        aria-hidden
        className="-mb-0.5 ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-blue-500"
      />
    </div>
  );
}
