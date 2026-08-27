"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Hash,
  Plus,
  X,
  Trash,
  ArrowUp,
  List,
  ChatsCircle,
  Users,
  Smiley,
  PushPin,
  ArrowBendDoubleUpLeft,
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
import {
  requestNotificationPermission,
  sendBrowserNotification,
} from "@/lib/push-notifications";

type ViewMode = "channels" | "dms";

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "👀"];

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
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const [dmSearch, setDmSearch] = useState("");
  const [showPinned, setShowPinned] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  }, [input]);

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
    const existing = dmConversations.find((c) => c.peer_id === initialDmPeerId);
    if (existing) {
      setActiveDmPeer(existing);
    } else {
      import("@/app/actions/chat-actions").then(({ getProfileById }) => {
        getProfileById(initialDmPeerId).then((peer) => {
          if (peer) {
            setDmConversations((prev) => {
              if (prev.some((c) => c.peer_id === peer.id)) {
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

  // Realtime subscription for DMs + browser push notifications
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
          // Browser push notification
          sendBrowserNotification(
            activeDmPeer.peer_name,
            newMsg.content.length > 100 ? newMsg.content.slice(0, 100) + "..." : newMsg.content,
          );
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeDmPeer, viewMode, user]);

  // Global DM listener for notifications when NOT in the DM view
  useEffect(() => {
    if (!user) return;
    const sb = createClient();

    const channel = sb.channel(`dm-notify-${user.id}`);
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as DirectMessage;
          // Don't notify for messages we're currently viewing
          if (viewMode === "dms" && activeDmPeer?.peer_id === newMsg.sender_id) return;

          // Fetch sender name
          const { data: sender } = await sb
            .from("profiles")
            .select("full_name")
            .eq("id", newMsg.sender_id)
            .single();

          const senderName = sender?.full_name ?? "Someone";
          sendBrowserNotification(
            senderName,
            newMsg.content.length > 100 ? newMsg.content.slice(0, 100) + "..." : newMsg.content,
          );

          // Update unread count in conversation list
          setDmConversations((prev) =>
            prev.map((c) =>
              c.peer_id === newMsg.sender_id
                ? { ...c, unread: c.unread + 1, last_message: newMsg.content, last_at: newMsg.created_at }
                : c,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, viewMode, activeDmPeer]);

  // ── Send handlers ──────────────────────────────────────────────────────

  const handleSendChannel = useCallback(async () => {
    if (!activeChannel || !input.trim() || sending) return;
    setSending(true);
    const res = await sendMessage(activeChannel.id, input.trim());
    setInput("");
    setReplyTo(null);
    setSending(false);
    if (res.ok && res.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message!.id)) return prev;
        return [...prev, res.message!];
      });
    }
    textareaRef.current?.focus();
  }, [activeChannel, input, sending]);

  const handleSendDm = useCallback(async () => {
    if (!activeDmPeer || !input.trim() || sending) return;
    setSending(true);
    const res = await sendDm(activeDmPeer.peer_id, input.trim());
    setInput("");
    setReplyTo(null);
    setSending(false);
    if (res.ok && res.message) {
      setDmMessages((prev) => {
        if (prev.some((m) => m.id === res.message!.id)) return prev;
        return [...prev, res.message!];
      });
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
    textareaRef.current?.focus();
  }, [activeDmPeer, input, sending]);

  const handleSend = viewMode === "channels" ? handleSendChannel : handleSendDm;

  // Handle keydown: Enter = send, Shift+Enter = newline
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Ctrl+B for bold
    if (e.key === "b" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = input.substring(start, end);
      const newVal = input.substring(0, start) + `**${selected}**` + input.substring(end);
      setInput(newVal);
      setTimeout(() => {
        ta.selectionStart = start + 2;
        ta.selectionEnd = end + 2;
      }, 0);
    }
  }

  // ── Channel CRUD ───────────────────────────────────────────────────────

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
    if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== msgId));
  }

  async function handleDeleteDm(msgId: string) {
    const res = await deleteDm(msgId);
    if (res.ok) setDmMessages((prev) => prev.filter((m) => m.id !== msgId));
  }

  function toggleReaction(msgId: string, emoji: string) {
    setReactions((prev) => {
      const current = prev[msgId] ?? [];
      const has = current.includes(emoji);
      return { ...prev, [msgId]: has ? current.filter((e) => e !== emoji) : [...current, emoji] };
    });
    setEmojiPickerMsgId(null);
  }

  // ── Derived state ──────────────────────────────────────────────────────

  const filteredDmConversations = useMemo(() => {
    const needle = dmSearch.trim().toLowerCase();
    return needle
      ? dmConversations.filter((c) => c.peer_name.toLowerCase().includes(needle))
      : dmConversations;
  }, [dmConversations, dmSearch]);

  const displayedDmMessages = showPinned
    ? dmMessages.filter((m) => pinnedIds.includes(m.id))
    : dmMessages;

  const currentMessages = viewMode === "channels" ? messages : displayedDmMessages;
  const currentName = viewMode === "channels" ? activeChannel?.name ?? "" : activeDmPeer?.peer_name ?? "";
  const currentDescription = viewMode === "channels" ? activeChannel?.description ?? null : null;
  const hasActive = viewMode === "channels" ? !!activeChannel : !!activeDmPeer;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
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
                  onClick={() => { setActiveChannel(ch); setMobileSidebar(false); }}
                >
                  <Hash className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{ch.name}</span>
                  {ch.created_by === user?.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteChannel(ch); }}
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
            <div className="space-y-2 px-3 py-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-gray-900">Direct Messages</h2>
                <button
                  type="button"
                  onClick={() => setShowPinned((v) => !v)}
                  className={cn("text-[11px]", showPinned ? "font-medium text-gray-900" : "text-gray-400 hover:text-gray-700")}
                >
                  Pinned
                </button>
              </div>
              <input
                value={dmSearch}
                onChange={(e) => setDmSearch(e.target.value)}
                placeholder="Search people"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[12px] outline-none focus:border-gray-300"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 no-scrollbar">
              {filteredDmConversations.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <ChatsCircle className="mx-auto h-6 w-6 text-gray-300" />
                  <p className="mt-2 text-[12px] text-gray-400">
                    No conversations yet. Click a teammate&apos;s profile in the Org Chart to start messaging.
                  </p>
                </div>
              ) : (
                filteredDmConversations.map((conv) => (
                  <div
                    key={conv.peer_id}
                    className={cn(
                      "group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                      activeDmPeer?.peer_id === conv.peer_id
                        ? "bg-gray-100 font-medium text-gray-900"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700",
                    )}
                    onClick={() => {
                      setActiveDmPeer({ ...conv, unread: 0 });
                      setMobileSidebar(false);
                      // Mark as read
                      setDmConversations((prev) =>
                        prev.map((c) => c.peer_id === conv.peer_id ? { ...c, unread: 0 } : c),
                      );
                    }}
                  >
                    <div className="relative">
                      <SquircleAvatar
                        name={conv.peer_name}
                        src={conv.peer_avatar}
                        size="xs"
                        className="h-7 w-7 text-[10px]"
                      />
                      {conv.unread > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-gray-900 ring-2 ring-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate", conv.unread > 0 && "font-semibold")}>{conv.peer_name}</p>
                      {conv.last_message && (
                        <p className={cn("truncate text-[11px]", conv.unread > 0 ? "text-gray-600" : "text-gray-400")}>
                          {conv.last_message}
                        </p>
                      )}
                    </div>
                    {conv.unread > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-bold text-white">
                        {conv.unread > 9 ? "9+" : conv.unread}
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
        <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setMobileSidebar(false)} />
      )}

      {/* ── Main chat area ──────────────────────────────────────── */}
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
            <div className="space-y-1">
              {currentMessages.map((msg, i) => {
                const prevMsg = i > 0 ? currentMessages[i - 1] : null;
                const isGrouped = prevMsg && prevMsg.sender_id === msg.sender_id &&
                  new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 300000;
                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isOwn={msg.sender_id === user?.id}
                    isGrouped={!!isGrouped}
                    isPinned={pinnedIds.includes(msg.id)}
                    reactions={reactions[msg.id] ?? []}
                    onReact={(emoji) => toggleReaction(msg.id, emoji)}
                    onPin={viewMode === "dms" ? () => setPinnedIds((c) => c.includes(msg.id) ? c.filter((id) => id !== msg.id) : [...c, msg.id]) : undefined}
                    onReply={viewMode === "dms" ? () => setReplyTo(msg as DirectMessage) : undefined}
                    onDelete={() => viewMode === "channels" ? handleDeleteMsg(msg.id) : handleDeleteDm(msg.id)}
                    showEmojiPicker={emojiPickerMsgId === msg.id}
                    onToggleEmoji={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Input area ───────────────────────────────────────── */}
        {hasActive && (
          <div className="border-t border-gray-100 px-4 py-3">
            {/* Reply bar */}
            {viewMode === "dms" && replyTo && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-[11px] text-gray-600">
                <ArrowBendDoubleUpLeft className="h-3 w-3 shrink-0" />
                <span className="flex-1 truncate">
                  Replying to <strong>{replyTo.sender_name}</strong>: {replyTo.content}
                </span>
                <button type="button" onClick={() => setReplyTo(null)} className="shrink-0 text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Composer */}
            <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 transition-colors focus-within:border-gray-300 focus-within:bg-white dark:border-gray-700 dark:bg-gray-900 dark:focus-within:bg-gray-800">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  viewMode === "channels"
                    ? `Message #${currentName} — type @celeste for AI`
                    : `Message ${currentName}...`
                }
                className="max-h-[120px] min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition-all hover:bg-gray-700 disabled:opacity-30 active:scale-90 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
              >
                <ArrowUp className="h-4 w-4" weight="bold" />
              </button>
            </div>

            <p className="mt-1.5 text-center text-[10px] text-gray-300">
              Press <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 text-[9px]">Enter</kbd> to send, <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 text-[9px]">Shift+Enter</kbd> for new line
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isOwn,
  isGrouped,
  isPinned,
  reactions,
  onReact,
  onPin,
  onReply,
  onDelete,
  showEmojiPicker,
  onToggleEmoji,
}: {
  msg: ChatMessage | DirectMessage;
  isOwn: boolean;
  isGrouped: boolean;
  isPinned: boolean;
  reactions: string[];
  onReact: (emoji: string) => void;
  onPin?: () => void;
  onReply?: () => void;
  onDelete: () => void;
  showEmojiPicker: boolean;
  onToggleEmoji: () => void;
}) {
  const isAI = "content" in msg && msg.content.startsWith("🤖 **Celeste AI**");
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={cn("group relative flex gap-2.5 px-1", isOwn && "flex-row-reverse", isGrouped && "mt-0.5")}>
      {/* Avatar (hidden when grouped) */}
      <div className="w-8 shrink-0">
        {!isGrouped && (
          <SquircleAvatar
            name={msg.sender_name ?? "?"}
            src={isAI ? null : msg.sender_avatar}
            size="sm"
          />
        )}
      </div>

      <div className={cn("max-w-[75%] min-w-0", isOwn && "text-right")}>
        {/* Name + time (hidden when grouped) */}
        {!isGrouped && (
          <div className={cn("mb-1 flex items-center gap-2", isOwn && "justify-end")}>
            <span className="text-[12px] font-semibold text-gray-800">
              {isAI ? "Celeste AI" : msg.sender_name}
            </span>
            <span className="text-[10px] text-gray-400">{time}</span>
            {isPinned && <PushPin className="h-3 w-3 text-amber-500" />}
          </div>
        )}

        {/* Message content */}
        <div
          className={cn(
            "whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed",
            isAI
              ? "border border-gray-100 bg-gray-50 text-gray-800"
              : isOwn
                ? "rounded-br-md bg-gray-900 text-white dark:bg-gray-700"
                : "rounded-bl-md bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
          )}
        >
          {msg.content}
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className={cn("mt-1 flex flex-wrap gap-1", isOwn && "justify-end")}>
            {reactions.map((emoji, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-[11px]"
              >
                {emoji}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons (on hover) */}
        <div className={cn("mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100", isOwn && "justify-end")}>
          <button
            type="button"
            onClick={onToggleEmoji}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Add reaction"
          >
            <Smiley className="h-3.5 w-3.5" />
          </button>
          {onReply && (
            <button
              type="button"
              onClick={onReply}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Reply"
            >
              <ArrowBendDoubleUpLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {onPin && (
            <button
              type="button"
              onClick={onPin}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title={isPinned ? "Unpin" : "Pin"}
            >
              <PushPin className={cn("h-3.5 w-3.5", isPinned && "text-amber-500")} />
            </button>
          )}
          {isOwn && (
            <button
              onClick={onDelete}
              className="rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-red-400"
              title="Delete"
            >
              <Trash className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className={cn("absolute z-10 mt-1 flex gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg", isOwn ? "right-0" : "left-0")}>
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className="rounded-lg p-1.5 text-base transition-colors hover:bg-gray-100"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
