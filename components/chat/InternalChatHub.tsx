"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Hash,
  Plus,
  X,
  Trash,
  PaperPlaneTilt,
  At,
  List,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import {
  getChannels,
  createChannel,
  deleteChannel,
  getMessages,
  sendMessage,
  deleteMessage,
  type Channel,
  type ChatMessage,
} from "@/app/actions/chat-actions";
import { useSession } from "@/components/layout/LayoutProvider";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { cn } from "@/lib/utils";

export function InternalChatHub() {
  const { user } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load channels
  useEffect(() => {
    getChannels().then((ch) => {
      setChannels(ch);
      if (ch.length > 0 && !activeChannel) {
        setActiveChannel(ch[0]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages when channel changes
  useEffect(() => {
    if (!activeChannel) return;
    getMessages(activeChannel.id).then(setMessages);
  }, [activeChannel]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!activeChannel) return;
    const sb = createClient();

    const channel = sb.channel(`chat-${activeChannel.id}`);
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${activeChannel.id}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Fetch sender info
          sb.from("profiles")
            .select("full_name, avatar_url")
            .eq("id", newMsg.sender_id)
            .single()
            .then(({ data }) => {
              setMessages((prev) => [
                ...prev,
                {
                  ...newMsg,
                  sender_name: data?.full_name ?? "Unknown",
                  sender_avatar: data?.avatar_url ?? null,
                },
              ]);
            });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${activeChannel.id}`,
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeChannel]);

  const handleSend = useCallback(async () => {
    if (!activeChannel || !input.trim() || sending) return;
    setSending(true);
    const res = await sendMessage(activeChannel.id, input.trim());
    setInput("");
    setSending(false);
    if (res.ok && res.message) {
      // Optimistic: message will also arrive via realtime, but add immediately
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message!.id)) return prev;
        return [...prev, res.message!];
      });
    }
    inputRef.current?.focus();
  }, [activeChannel, input, sending]);

  async function handleCreateChannel() {
    if (!newChannelName.trim()) return;
    const res = await createChannel(newChannelName.trim(), newChannelDesc.trim() || undefined);
    if (res.ok && res.channel) {
      setChannels((prev) => [...prev, res.channel!].sort((a, b) => a.name.localeCompare(b.name)));
      setActiveChannel(res.channel);
      setShowNewChannel(false);
      setNewChannelName("");
      setNewChannelDesc("");
    }
  }

  async function handleDeleteChannel(ch: Channel) {
    if (!confirm(`Delete #${ch.name}?`)) return;
    const res = await deleteChannel(ch.id);
    if (res.ok) {
      setChannels((prev) => prev.filter((c) => c.id !== ch.id));
      if (activeChannel?.id === ch.id) {
        setActiveChannel(channels.find((c) => c.id !== ch.id) ?? null);
      }
    }
  }

  async function handleDeleteMsg(msgId: string) {
    const res = await deleteMessage(msgId);
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Channel sidebar */}
      <div
        className={cn(
          "flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-72 max-md:shadow-xl",
          !mobileSidebar && "max-md:hidden",
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Channels</h2>
          <button
            onClick={() => setShowNewChannel(true)}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* New channel form */}
        {showNewChannel && (
          <div className="border-b border-gray-100 px-3 py-2.5">
            <input
              autoFocus
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateChannel()}
              placeholder="channel-name"
              className="mb-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[13px] outline-none focus:border-gray-300"
            />
            <input
              value={newChannelDesc}
              onChange={(e) => setNewChannelDesc(e.target.value)}
              placeholder="Description (optional)"
              className="mb-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[13px] outline-none focus:border-gray-300"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleCreateChannel}
                className="rounded-lg bg-gray-900 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-gray-700"
              >
                Create
              </button>
              <button
                onClick={() => setShowNewChannel(false)}
                className="px-2.5 py-1 text-[12px] text-gray-400 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto p-1.5">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className={cn(
                "group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                activeChannel?.id === ch.id
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700",
              )}
              onClick={() => {
                setActiveChannel(ch);
                setMobileSidebar(false);
              }}
            >
              <Hash className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">{ch.name}</span>
              {ch.created_by === user?.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChannel(ch);
                  }}
                  className="hidden rounded p-0.5 text-gray-300 hover:text-red-500 group-hover:block"
                >
                  <Trash className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileSidebar && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={() => setMobileSidebar(false)}
        />
      )}

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Channel header */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
          <button
            onClick={() => setMobileSidebar(true)}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 md:hidden"
          >
            <List className="h-5 w-5" />
          </button>
          {activeChannel && (
            <>
              <Hash className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {activeChannel.name}
                </p>
                {activeChannel.description && (
                  <p className="text-[11px] text-gray-400">
                    {activeChannel.description}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!activeChannel ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-400">
                Select a channel to start chatting
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <Hash className="h-8 w-8 text-gray-200" />
              <p className="text-sm text-gray-400">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isOwn={msg.sender_id === user?.id}
                  onDelete={() => handleDeleteMsg(msg.id)}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        {activeChannel && (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={`Message #${activeChannel.name} — type @celeste for AI`}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white transition-colors hover:bg-gray-700 disabled:opacity-30"
              >
                <PaperPlaneTilt className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  isOwn,
  onDelete,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  onDelete: () => void;
}) {
  const isAI = msg.content.startsWith("🤖 **Celeste AI**");

  return (
    <div className={cn("group flex gap-3", isOwn && !isAI && "flex-row-reverse")}>
      <SquircleAvatar
        name={msg.sender_name ?? "?"}
        src={isAI ? null : msg.sender_avatar}
        size="sm"
      />
      <div className={cn("max-w-[70%]", isOwn && !isAI && "text-right")}>
        <div className="mb-0.5 flex items-center gap-2">
          <span className="text-[12px] font-medium text-gray-700">
            {isAI ? "Celeste AI" : msg.sender_name}
          </span>
          <span className="text-[10px] text-gray-300">
            {new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {msg.edited_at && (
            <span className="text-[10px] text-gray-300">(edited)</span>
          )}
        </div>
        <div
          className={cn(
            "whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
            isAI
              ? "border border-gray-100 bg-gray-50 text-gray-800"
              : isOwn
                ? "rounded-br-md bg-gray-900 text-white"
                : "rounded-bl-md border border-gray-100 bg-gray-50 text-gray-800",
          )}
        >
          {msg.content}
        </div>
        {isOwn && (
          <button
            onClick={onDelete}
            className="mt-1 text-[11px] text-gray-300 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
