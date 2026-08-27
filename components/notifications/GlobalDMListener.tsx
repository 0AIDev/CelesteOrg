"use client";

import { useEffect, createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  requestNotificationPermission,
  sendBrowserNotification,
} from "@/lib/push-notifications";
import { useRouter } from "next/navigation";

type UnreadMap = Record<string, number>; // peer_id -> count

type DMNotificationContextType = {
  totalUnread: number;
  getUnread: (peerId: string) => number;
};

const DMNotificationContext = createContext<DMNotificationContextType>({
  totalUnread: 0,
  getUnread: () => 0,
});

export const useDMNotifications = () => useContext(DMNotificationContext);

export function GlobalDMListener({ userId, children }: { userId: string; children?: ReactNode }) {
  const router = useRouter();
  const [unreadMap, setUnreadMap] = useState<UnreadMap>({});

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Global realtime listener for ALL incoming DMs
  useEffect(() => {
    if (!userId) return;
    const sb = createClient();

    const channel = sb.channel(`dm-global-${userId}`);
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          const newMsg = payload.new as { sender_id: string; content: string; id: string };

          // Fetch sender info
          const { data: sender } = await sb
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", newMsg.sender_id)
            .single();

          const senderName = sender?.full_name ?? "Someone";
          const preview = newMsg.content.length > 100 ? newMsg.content.slice(0, 100) + "..." : newMsg.content;

          // Update unread count
          setUnreadMap((prev) => ({
            ...prev,
            [newMsg.sender_id]: (prev[newMsg.sender_id] ?? 0) + 1,
          }));

          // Send browser push notification (only if page not focused)
          sendBrowserNotification(senderName, preview, () => {
            // On notification click → navigate to chat with this peer
            router.push(`/chat?peer=${newMsg.sender_id}`);
          });
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, router]);

  const totalUnread = Object.values(unreadMap).reduce((sum, n) => sum + n, 0);

  const getUnread = useCallback((peerId: string) => unreadMap[peerId] ?? 0, [unreadMap]);

  return (
    <DMNotificationContext.Provider value={{ totalUnread, getUnread }}>
      {children}
    </DMNotificationContext.Provider>
  );
}
