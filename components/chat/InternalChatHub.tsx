"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Hash,
  Plus,
  X,
  Trash,
  PaperPlaneTilt,
  List,
  ChatsCircle,
  Circle,
  Users,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import {
  getChannels,
  createChannel,
  deleteChannel,
  getChannelMembers,
  addChannelMember,
  removeChannelMember,
  canManageChannel,
  getMessages,
  sendMessage,
  deleteMessage,
  getDmConversations,
  getDmMessages,
  sendDm,
  deleteDm,
  type Channel,
  type ChatMessage,
  type DmConversation,
  type DirectMessage,
  type ChannelMember,
} from "@/app/actions/chat-actions";
import { useSession } from "@/components/layout/LayoutProvider";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { cn } from "@/lib/utils";

type ViewMode = "channels" | "dms";

export function InternalChatHub({ initialDmPeerId }: { initialDmPeerId?: string }) {
  const { user } = useSession();
  const [viewMode, setViewMode] = useState<ViewMode>("channels");

  // Channel state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [channelMembers, setChannelMembers] = useState<ChannelMember[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [addMemberId, setAddMemberId] = useState("");

  // DM state
  const [dmConversations, setDmConversations] = useState<DmConversation[]>([]);
  const [activeDmPeer, setActiveDmPeer] = useState<DmConversation | null>(null);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);

  // Shared
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load channels
  useEffect(() => {
    getChannels().then((ch) => {
      setChannels(ch);
      if (ch.length > 0 && !activeChannel && viewMode === "channels") {
        setActiveChannel(ch[0]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load DM conversations (deduplicated by peer_id)
  useEffect(() => {
    getDmConversations().then((convs) => {
      // Deduplicate by peer_id, keeping the one with the latest message
      const seen = new Map<string, DmConversation>();
      for (const c of convs) {
        const existing = seen.get(c.peer_id);
        if (!existing || new Date(c.last_at) > new Date(existing.last_at)) {
          seen.set(c.peer_id, c);
        }
      }
      setDmConversations(Array.from(seen.values()));
    });
  }, []);

  // Load messages when channel changes
  useEffect(() => {
    if (!activeChannel) return;
    getMessages(activeChannel.id).then(setMessages);
    // Load channel members and permissions
    getChannelMembers(activeChannel.id).then(setChannelMembers);
    canManageChannel(activeChannel.id).then(setCanManage);
  }, [activeChannel]);

  // Load DM messages when peer changes
  useEffect(() => {
    if (!activeDmPeer) return;
    getDmMessages(activeDmPeer.peer_id).then(setDmMessages);
  }, [activeDmPeer]);

  // Handle initial DM peer from org chart
  useEffect(() => {
    if (!initialDmPeerId || !user) return;
    setViewMode("dms");
    // Check if conversation already exists
    const existing = dmConversations.find((c) => c.peer_id === initialDmPeerId);
    if (existing) {
      setActiveDmPeer(existing);
    } else {
      // Fetch peer info and create a placeholder conversation (only if not already added)
      import("@/app/actions/chat-actions").then(({ getProfileById }) => {
        getProfileById(initialDmPeerId).then((peer) => {
          if (peer) {
            // Double-check no duplicate exists before adding
            setDmConversations((prev) => {
              if (prev.some((c) => c.peer_id === peer.id)) {
                // Already exists, just set it as active
                const existingConv = prev.find((c) => c.peer_id === peer.id);
                if (existingConv) setActiveDmPeer(existingConv);
                return prev;
              }
              const conv: DmConversation = {
                peer_id: peer.id,
                peer_name: peer.full_name,
                peer_avatar: peer.avatar_url,
                last_message: "",
                last_at: new Date().toISOString(),
                unread: 0,
              };
              setActiveDmPeer(conv);
              return [conv, ...prev];
            });
          }
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDmPeerId, user]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, dmMessages]);

  // Realtime subscription for channels
  useEffect(() => {
    if (!activeChannel || viewMode !== "channels") return;
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
          // Deduplicate: skip if already in state (optimistic add)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            sb.from("profiles")
              .select("full_name, avatar_url")
              .eq("id", newMsg.sender_id)
              .single()
              .then(({ data }) => {
                setMessages((curr) => {
                  if (curr.some((m) => m.id === newMsg.id)) return curr;
                  return [
                    ...curr,
                    {
                      ...newMsg,
                      sender_name: data?.full_name ?? "Unknown",
                      sender_avatar: data?.avatar_url ?? null,
                    },
                  ];
                });
              });
            return prev;
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
  }, [activeChannel, viewMode]);

  // Realtime subscription for DMs
  useEffect(() => {
    if (!activeDmPeer || viewMode !== "dms" || !user) return;
    const sb = createClient();

    const channel = sb.channel(`dm-${user.id}-${activeDmPeer.peer_id}`);
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `sender_id=eq.${activeDmPeer.peer_id}`,
        },
        (payload) => {
          const newMsg = payload.new as DirectMessage;
          if (newMsg.receiver_id !== user.id) return;
          setDmMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, {
              ...newMsg,
              sender_name: activeDmPeer.peer_name,
              sender_avatar: activeDmPeer.peer_avatar,
            }];
          });
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeDmPeer, viewMode, user]);

  // Send channel message
  const handleSendChannel = useCallback(async () => {
    if (!activeChannel || !input.trim() || sending) return;
    setSending(true);
    const res = await sendMessage(activeChannel.id, input.trim());
    setInput("");
    setSending(false);
    if (res.ok && res.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message!.id)) return prev;
        return [...prev, res.message!];
      });
    }
    inputRef.current?.focus();
  }, [activeChannel, input, sending]);

  // Send DM
  const handleSendDm = useCallback(async () => {
    if (!activeDmPeer || !input.trim() || sending) return;
    setSending(true);
    const res = await sendDm(activeDmPeer.peer_id, input.trim());
    setInput("");
    setSending(false);
    if (res.ok && res.message) {
      setDmMessages((prev) => {
        if (prev.some((m) => m.id === res.message!.id)) return prev;
        return [...prev, res.message!];
      });
      // Update conversation list
      setDmConversations((prev) => {
        const idx = prev.findIndex((c) => c.peer_id === activeDmPeer.peer_id);
        const updated = {
          ...activeDmPeer,
          last_message: res.message!.content,
          last_at: res.message!.created_at,
        };
        if (idx >= 0) {
          return [updated, ...prev.filter((c) => c.peer_id !== activeDmPeer.peer_id)];
        }
        return [updated, ...prev];
      });
    }
    inputRef.current?.focus();
  }, [activeDmPeer, input, sending]);

  const handleSend = viewMode === "channels" ? handleSendChannel : handleSendDm;

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

  async function handleAddMember() {
    if (!activeChannel || !addMemberId.trim()) return;
    const res = await addChannelMember(activeChannel.id, addMemberId.trim());
    if (res.ok) {
      getChannelMembers(activeChannel.id).then(setChannelMembers);
      setAddMemberId("");
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!activeChannel) return;
    const res = await removeChannelMember(activeChannel.id, userId);
    if (res.ok) {
      setChannelMembers((prev) => prev.filter((m) => m.user_id !== userId));
    }
  }

  async function handleDeleteMsg(msgId: string) {
    const res = await deleteMessage(msgId);
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }
  }

  async function handleDeleteDm(msgId: string) {
    const res = await deleteDm(msgId);
    if (res.ok) {
      setDmMessages((prev) => prev.filter((m) => m.id !== msgId));
    }
  }

  const currentMessages = viewMode === "channels" ? messages : dmMessages;
  const currentName = viewMode === "channels"
    ? activeChannel?.name ?? ""
    : activeDmPeer?.peer_name ?? "";
  const currentDescription = viewMode === "channels"
    ? activeChannel?.description ?? null
    : null;
  const hasActive = viewMode === "channels" ? !!activeChannel : !!activeDmPeer;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Sidebar */}
      <div
        className={cn(
          "flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-72 max-md:shadow-xl",
          !mobileSidebar && "max-md:hidden",
        )}
      >
        {/* Mode tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setViewMode("channels")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors",
              viewMode === "channels"
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-400 hover:text-gray-600",
            )}
          >
            <Hash className="h-3.5 w-3.5" />
            Channels
          </button>
          <button
            onClick={() => setViewMode("dms")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors",
              viewMode === "dms"
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-400 hover:text-gray-600",
            )}
          >
            <ChatsCircle className="h-3.5 w-3.5" />
            Direct
          </button>
        </div>

        {/* Channels view */}
        {viewMode === "channels" && (
          <>
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Channels</h2>
              <button
                onClick={() => setShowNewChannel(true)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

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

            <div className="flex-1 overflow-y-auto p-1.5 no-scrollbar">
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
          </>
        )}

        {/* DMs view */}
        {viewMode === "dms" && (
          <>
            <div className="px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Direct Messages</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 no-scrollbar">
              {dmConversations.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <ChatsCircle className="mx-auto h-6 w-6 text-gray-300" />
                  <p className="mt-2 text-[12px] text-gray-400">
                    No conversations yet. Click a teammate&apos;s profile in the Org Chart to start messaging.
                  </p>
                </div>
              ) : (
                dmConversations.map((conv) => (
                  <div
                    key={conv.peer_id}
                    className={cn(
                      "group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                      activeDmPeer?.peer_id === conv.peer_id
                        ? "bg-gray-100 font-medium text-gray-900"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700",
                    )}
                    onClick={() => {
                      setActiveDmPeer(conv);
                      setMobileSidebar(false);
                    }}
                  >
                    <SquircleAvatar
                      name={conv.peer_name}
                      src={conv.peer_avatar}
                      size="xs"
                      className="h-7 w-7 text-[10px]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{conv.peer_name}</p>
                      {conv.last_message && (
                        <p className="truncate text-[11px] text-gray-400">
                          {conv.last_message}
                        </p>
                      )}
                    </div>
                    {conv.unread > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-bold text-white">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
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
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
          <button
            onClick={() => setMobileSidebar(true)}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 md:hidden"
          >
            <List className="h-5 w-5" />
          </button>
          {hasActive && (
            <>
              {viewMode === "channels" ? (
                <Hash className="h-4 w-4 text-gray-400" />
              ) : (
                <SquircleAvatar
                  name={activeDmPeer?.peer_name}
                  src={activeDmPeer?.peer_avatar}
                  size="xs"
                  className="h-6 w-6 text-[10px]"
                />
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900">{currentName}</p>
                {currentDescription && (
                  <p className="text-[11px] text-gray-400">{currentDescription}</p>
                )}
              </div>
              {viewMode === "channels" && activeChannel && (
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50"
                >
                  <Users className="h-3.5 w-3.5" />
                  {channelMembers.length} members
                </button>
              )}
            </>
          )}
        </div>

        {/* Channel Members Panel */}
        {showMembers && viewMode === "channels" && activeChannel && (
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-medium text-gray-700">Channel Members</p>
              <button onClick={() => setShowMembers(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {channelMembers.map((m) => (
                <div key={m.user_id} className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1">
                  <SquircleAvatar name={m.user?.full_name} src={m.user?.avatar_url} size="xs" className="h-4 w-4 text-[7px]" />
                  <span className="text-[11px] text-gray-600">{m.user?.full_name ?? "Unknown"}</span>
                  {m.role === "admin" && <span className="text-[9px] text-gray-400">(admin)</span>}
                  {canManage && m.user_id !== user?.id && (
                    <button onClick={() => handleRemoveMember(m.user_id)} className="ml-0.5 text-gray-300 hover:text-red-500">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {canManage && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={addMemberId}
                  onChange={(e) => setAddMemberId(e.target.value)}
                  placeholder="User ID to add..."
                  className="h-7 flex-1 rounded-lg border border-gray-200 px-2 text-[11px] outline-none focus:border-gray-300"
                />
                <button
                  onClick={handleAddMember}
                  disabled={!addMemberId.trim()}
                  className="h-7 rounded-lg bg-gray-900 px-2.5 text-[11px] font-medium text-white hover:bg-gray-800 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
          {!hasActive ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-400">
                {viewMode === "channels"
                  ? "Select a channel to start chatting"
                  : "Select a conversation or message someone from the Org Chart"}
              </p>
            </div>
          ) : currentMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              {viewMode === "channels" ? (
                <Hash className="h-8 w-8 text-gray-200" />
              ) : (
                <ChatsCircle className="h-8 w-8 text-gray-200" />
              )}
              <p className="text-sm text-gray-400">
                {viewMode === "channels"
                  ? "No messages yet. Start the conversation!"
                  : `Say hello to ${currentName}!`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentMessages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isOwn={msg.sender_id === user?.id}
                  onDelete={() =>
                    viewMode === "channels"
                      ? handleDeleteMsg(msg.id)
                      : handleDeleteDm(msg.id)
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        {hasActive && (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={
                  viewMode === "channels"
                    ? `Message #${currentName} — type @celeste for AI`
                    : `Message ${currentName}...`
                }
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
  msg: ChatMessage | DirectMessage;
  isOwn: boolean;
  onDelete: () => void;
}) {
  const isAI = "content" in msg && msg.content.startsWith("🤖 **Celeste AI**");

  return (
    <div className={cn("group flex gap-3", isOwn && "flex-row-reverse")}>
      <SquircleAvatar
        name={msg.sender_name ?? "?"}
        src={isAI ? null : msg.sender_avatar}
        size="sm"
      />
      <div className={cn("max-w-[70%]", isOwn && "text-right")}>
        <div className={cn("mb-0.5 flex items-center gap-2", isOwn && "justify-end")}>
          <span className="text-[12px] font-medium text-gray-700">
            {isAI ? "Celeste AI" : msg.sender_name}
          </span>
          <span className="text-[10px] text-gray-300">
            {new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div
          className={cn(
            "whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
            isAI
              ? "border border-gray-100 bg-gray-50 text-gray-800"
              : isOwn
                ? "rounded-br-md bg-gray-900 text-white"
                : "rounded-bl-md border border-gray-100 bg-white text-gray-800 shadow-sm",
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
