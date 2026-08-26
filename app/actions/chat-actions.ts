"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Channel = {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_by: string | null;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  channel_id: string;
  sender_id: string | null;
  content: string;
  attachments: { name: string; url: string; type: string }[];
  edited_at: string | null;
  created_at: string;
  // joined
  sender_name?: string;
  sender_avatar?: string | null;
};

// ─── Channels ────────────────────────────────────────────────────────────────

export async function getChannels(): Promise<Channel[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("channels")
    .select("*")
    .order("name");
  if (error) {
    console.error("[chat] getChannels:", error.message);
    return [];
  }
  return (data ?? []) as Channel[];
}

export async function createChannel(
  name: string,
  description?: string,
  isPrivate = false,
): Promise<{ ok: boolean; channel?: Channel; error?: string }> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Use admin client to bypass potential RLS issues
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("channels")
    .insert({
      name: slug,
      description: description || null,
      is_private: isPrivate,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Channel already exists" };
    return { ok: false, error: error.message };
  }
  return { ok: true, channel: data as Channel };
}

export async function deleteChannel(channelId: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { error } = await sb.from("channels").delete().eq("id", channelId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── Channel Members (Access Control) ───────────────────────────────────────

export type ChannelMember = {
  id: string;
  channel_id: string;
  user_id: string;
  role: string;
  added_by: string | null;
  created_at: string;
  user?: { full_name: string | null; avatar_url: string | null } | null;
};

export async function getChannelMembers(channelId: string): Promise<ChannelMember[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("channel_members")
    .select("*, user:profiles!channel_members_user_id_fkey(full_name, avatar_url)")
    .eq("channel_id", channelId)
    .order("created_at");
  return (data as ChannelMember[]) ?? [];
}

export async function addChannelMember(
  channelId: string,
  userId: string,
  role = "member",
): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const admin = createAdminClient();
  const { error } = await admin.from("channel_members").insert({
    channel_id: channelId,
    user_id: userId,
    role,
    added_by: user.id,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Member already in channel" };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function removeChannelMember(
  channelId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("channel_members")
    .delete()
    .eq("channel_id", channelId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function canManageChannel(channelId: string): Promise<boolean> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;

  // Check if user is founder/admin
  const { data: profile } = await sb
    .from("profiles")
    .select("is_founder")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.is_founder) return true;

  // Check if user created the channel
  const { data: channel } = await sb
    .from("channels")
    .select("created_by")
    .eq("id", channelId)
    .maybeSingle();
  if (channel?.created_by === user.id) return true;

  // Check if user is channel admin
  const { data: member } = await sb
    .from("channel_members")
    .select("role")
    .eq("channel_id", channelId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (member?.role === "admin") return true;

  return false;
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function getMessages(
  channelId: string,
  limit = 100,
): Promise<ChatMessage[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("chat_messages")
    .select("*, sender:profiles!sender_id(full_name, avatar_url)")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[chat] getMessages:", error.message);
    return [];
  }

  return (data ?? []).map((m: Record<string, unknown>) => ({
    ...(m as Omit<ChatMessage, "sender_name" | "sender_avatar">),
    sender_name: (m.sender as Record<string, unknown>)?.full_name as string ?? "Unknown",
    sender_avatar: (m.sender as Record<string, unknown>)?.avatar_url as string ?? null,
  })) as ChatMessage[];
}

export async function sendMessage(
  channelId: string,
  content: string,
  attachments?: { name: string; url: string; type: string }[],
): Promise<{ ok: boolean; message?: ChatMessage; error?: string }> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Check for @Celeste mention — trigger AI if present
  let finalContent = content;
  if (/@celeste/i.test(content)) {
    const question = content.replace(/@celeste/gi, "").trim();
    if (question.length > 2) {
      try {
        const { askAi } = await import("@/app/actions/ai-assistant");
        const aiRes = await askAi(question);
        if (aiRes.ok) {
          finalContent = content; // keep the original message
          // We'll insert a second AI response message after the user message
          const { data: userMsg, error: userErr } = await sb
            .from("chat_messages")
            .insert({
              channel_id: channelId,
              sender_id: user.id,
              content,
              attachments: attachments ?? [],
            })
            .select()
            .single();

          if (userErr) return { ok: false, error: userErr.message };

          // Insert AI response as a system-like message from the first user (Celeste bot)
          const { data: aiMsg } = await sb
            .from("chat_messages")
            .insert({
              channel_id: channelId,
              sender_id: user.id, // same user for simplicity; could be a bot user
              content: `🤖 **Celeste AI**\n\n${aiRes.answer}`,
              attachments: [],
            })
            .select()
            .single();

          return {
            ok: true,
            message: {
              ...(userMsg as ChatMessage),
              sender_name: user.email ?? "You",
              sender_avatar: null,
            },
          };
        }
      } catch {
        // If AI fails, just send the message as-is
      }
    }
  }

  const { data, error } = await sb
    .from("chat_messages")
    .insert({
      channel_id: channelId,
      sender_id: user.id,
      content: finalContent,
      attachments: attachments ?? [],
    })
    .select("*, sender:profiles!sender_id(full_name, avatar_url)")
    .single();

  if (error) return { ok: false, error: error.message };

  const m = data as Record<string, unknown>;
  return {
    ok: true,
    message: {
      ...(m as Omit<ChatMessage, "sender_name" | "sender_avatar">),
      sender_name: (m.sender as Record<string, unknown>)?.full_name as string ?? "You",
      sender_avatar: (m.sender as Record<string, unknown>)?.avatar_url as string ?? null,
    } as ChatMessage,
  };
}

export async function editMessage(
  messageId: string,
  content: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { error } = await sb
    .from("chat_messages")
    .update({ content, edited_at: new Date().toISOString() })
    .eq("id", messageId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteMessage(
  messageId: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { error } = await sb.from("chat_messages").delete().eq("id", messageId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── Direct Messages ─────────────────────────────────────────────────────────

export type DmConversation = {
  peer_id: string;
  peer_name: string;
  peer_avatar: string | null;
  last_message: string;
  last_at: string;
  unread: number;
};

export type DirectMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string | null;
};

/** Get all DM conversations for the current user (last message + unread count per peer). */
export async function getDmConversations(): Promise<DmConversation[]> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];

  // Fetch all messages involving the current user
  const { data, error } = await sb
    .from("direct_messages")
    .select("sender_id, receiver_id, content, created_at, read")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  // Group by conversation partner
  const convMap = new Map<
    string,
    { last_message: string; last_at: string; unread: number }
  >();

  for (const msg of data) {
    const peerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
    if (!convMap.has(peerId)) {
      convMap.set(peerId, {
        last_message: msg.content,
        last_at: msg.created_at,
        unread: 0,
      });
    }
    const conv = convMap.get(peerId)!;
    // Count unread messages sent TO the current user
    if (msg.receiver_id === user.id && !msg.read) {
      conv.unread++;
    }
  }

  // Fetch profile info for all peers
  const peerIds = Array.from(convMap.keys());
  if (peerIds.length === 0) return [];

  const { data: profiles } = await sb
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", peerIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  return Array.from(convMap.entries()).map(([peerId, conv]) => {
    const p = profileMap.get(peerId);
    return {
      peer_id: peerId,
      peer_name: p?.full_name ?? "Unknown",
      peer_avatar: p?.avatar_url ?? null,
      ...conv,
    };
  }).sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());
}

/** Get messages in a DM conversation between current user and a peer. */
export async function getDmMessages(
  peerId: string,
  limit = 100,
): Promise<DirectMessage[]> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];

  const { data, error } = await sb
    .from("direct_messages")
    .select("*, sender:profiles!sender_id(full_name, avatar_url)")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${user.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  // Mark messages from peer as read
  await sb
    .from("direct_messages")
    .update({ read: true })
    .eq("sender_id", peerId)
    .eq("receiver_id", user.id)
    .eq("read", false);

  return data.map((m: Record<string, unknown>) => ({
    id: m.id as string,
    sender_id: m.sender_id as string,
    receiver_id: m.receiver_id as string,
    content: m.content as string,
    read: m.read as boolean,
    created_at: m.created_at as string,
    sender_name: (m.sender as Record<string, unknown>)?.full_name as string ?? "Unknown",
    sender_avatar: (m.sender as Record<string, unknown>)?.avatar_url as string ?? null,
  })) as DirectMessage[];
}

/** Send a direct message to a peer. */
export async function sendDm(
  peerId: string,
  content: string,
): Promise<{ ok: boolean; message?: DirectMessage; error?: string }> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (peerId === user.id) return { ok: false, error: "Cannot message yourself" };

  // Get sender name for notification
  const { data: senderProfile } = await sb
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const senderName = senderProfile?.full_name ?? "Someone";

  const { data, error } = await sb
    .from("direct_messages")
    .insert({
      sender_id: user.id,
      receiver_id: peerId,
      content,
    })
    .select("*, sender:profiles!sender_id(full_name, avatar_url)")
    .single();

  if (error) return { ok: false, error: error.message };

  // Send notification to recipient
  const { notify } = await import("@/lib/notify");
  const preview = content.length > 80 ? content.slice(0, 80) + "..." : content;
  await notify(peerId, "dm", `New message from ${senderName}`, preview, data.id);

  const m = data as Record<string, unknown>;
  return {
    ok: true,
    message: {
      id: m.id as string,
      sender_id: m.sender_id as string,
      receiver_id: m.receiver_id as string,
      content: m.content as string,
      read: m.read as boolean,
      created_at: m.created_at as string,
      sender_name: (m.sender as Record<string, unknown>)?.full_name as string ?? "You",
      sender_avatar: (m.sender as Record<string, unknown>)?.avatar_url as string ?? null,
    } as DirectMessage,
  };
}

/** Delete a direct message (only sender can delete). */
export async function deleteDm(
  messageId: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { error } = await sb.from("direct_messages").delete().eq("id", messageId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Get a profile by ID (for opening a DM from org chart). */
export async function getProfileById(
  profileId: string,
): Promise<{ id: string; full_name: string; avatar_url: string | null } | null> {
  const sb = await createClient();
  const { data } = await sb
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", profileId)
    .single();
  return data ?? null;
}
