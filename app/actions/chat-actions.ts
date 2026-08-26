"use server";

import { createClient } from "@/lib/supabase/server";

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

  const { data, error } = await sb
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
