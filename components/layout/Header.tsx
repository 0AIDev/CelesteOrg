"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import {
  MagnifyingGlass,
  Bell,
  ChatCircleText,
  CaretDown,
  SignOut,
  GearSix,
  UserCircle,
  Check,
} from "@phosphor-icons/react";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { createClient } from "@/lib/supabase/client";
import { cn, relativeTime } from "@/lib/utils";

type NotifItem = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  created_at: string;
  read_at: string | null;
};

export function Header({
  toggleSidebar,
  profile,
  onNavigate,
  sidebarOpen,
  onOpenCmdk,
}: {
  toggleSidebar: () => void;
  profile?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    departmentName?: string | null;
  } | null;
  onNavigate?: (path: string) => void;
  sidebarOpen?: boolean;
  onOpenCmdk?: () => void;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Resolve the current user's id once (StrictMode-safe: guarded by `mounted`,
  // so the double mount in dev can't double-subscribe the realtime channel).
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (mounted) setUserId(user?.id ?? null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Load notifications + live-subscribe. The channel is created synchronously
  // in this effect and only after userId is known (post-mount), so React
  // StrictMode's double-invoke never sees a duplicate already-subscribed
  // channel with the same name.
  useEffect(() => {
    if (!userId) return;
    const sb = createClient();

    const channel = sb.channel("celeste-notifications");
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as NotifItem;
          setNotifications((prev) => [n, ...prev].slice(0, 12));
        },
      )
      .subscribe();

    sb.from("notifications")
      .select("id, title, body, type, created_at, read_at")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (data) setNotifications(data as NotifItem[]);
      });

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  async function markAllRead() {
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();
    await sb
      .from("notifications")
      .update({ read_at: now })
      .eq("recipient_id", user.id)
      .is("read_at", null);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: now })));
  }

  const unread = notifications.filter((n) => !n.read_at).length;

  const go = (path: string) => (onNavigate ? onNavigate(path) : router.push(path));

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md lg:px-5">
      <button
        onClick={toggleSidebar}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {sidebarOpen ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
            <rect x="7" y="6.5" width="7" height="1.5" rx="0.75" transform="rotate(90 7 6.5)" fill="currentColor" />
            <rect x="3" y="4" width="14" height="12" rx="2.8" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
            <rect x="10.5" y="6.5" width="7" height="5" rx="1" transform="rotate(90 10.5 6.5)" fill="currentColor" />
            <rect x="3" y="4" width="14" height="12" rx="2.8" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        )}
      </button>

      {/* Global search — small centered pill; opens the ⌘K palette */}
      <button
        onClick={onOpenCmdk}
        className="group mx-auto hidden w-64 max-w-full items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white pl-2 pr-[7px] text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 lg:flex"
        style={{ height: "2rem" }}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <MagnifyingGlass className="h-[18px] w-[18px] shrink-0 text-gray-400 transition-colors group-hover:text-gray-600" />
          <span className="truncate text-[13px] font-normal text-gray-500">Search everything...</span>
        </span>
        <span className="flex shrink-0 gap-1">
          <kbd className="flex h-[18px] w-fit items-center rounded-md border border-gray-200 bg-gray-50 px-1 text-[11px] font-medium text-gray-500">⌘</kbd>
          <kbd className="flex h-[18px] w-fit items-center rounded-md border border-gray-200 bg-gray-50 px-1 text-[11px] font-medium text-gray-500">K</kbd>
        </span>
      </button>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1 md:ml-0">

        {/* Notifications */}
        <Popover.Root>
          <Popover.Trigger asChild>
            <button className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={6}
              className="z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-pop dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Notifications
                  {unread > 0 && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                      {unread} new
                    </span>
                  )}
                </span>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs font-medium text-gray-900 hover:underline"
                  >
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto p-1.5">
                {notifications.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-gray-400">
                    Nothing here yet.
                  </p>
                )}
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 ${n.read_at ? "opacity-60" : ""}`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-gray-300" : "bg-gray-900"}`}
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium leading-snug text-gray-800 dark:text-gray-200">
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{n.body}</p>
                      )}
                      <p className="mt-0.5 text-[11px] text-gray-400">{relativeTime(n.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Profile dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="ml-1 flex items-center gap-1.5 rounded-full p-0.5 hover:bg-gray-100">
              <SquircleAvatar
                name={profile?.full_name ?? "?"}
                src={profile?.avatar_url}
                size="sm"
              />
              <CaretDown className="hidden h-3.5 w-3.5 text-gray-400 sm:block" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-pop"
            >
              <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                <SquircleAvatar name={profile?.full_name} src={profile?.avatar_url} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {profile?.full_name}
                  </p>
                  <p className="truncate text-xs text-gray-500">{profile?.email}</p>
                  {profile?.departmentName && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-gray-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      {profile.departmentName}
                    </p>
                  )}
                </div>
              </div>
              <div className="my-1 h-px bg-gray-100" />
              <MenuItem icon={<UserCircle className="h-4 w-4" />} onClick={() => go("/settings")}>
                Profile
              </MenuItem>
              <MenuItem icon={<GearSix className="h-4 w-4" />} onClick={() => go("/settings")}>
                Settings
              </MenuItem>
              <MenuItem icon={<ChatCircleText className="h-4 w-4" />} onClick={() => setFeedbackOpen(true)}>
                Feedback
              </MenuItem>
              <div className="my-1 h-px bg-gray-100" />
              <MenuItem
                icon={<SignOut className="h-4 w-4" />}
                danger
                onClick={async () => {
                  const sb = (await import("@/lib/supabase/client")).createClient();
                  await sb.auth.signOut();
                  router.push("/sign-in");
                  router.refresh();
                }}
              >
                Sign out
              </MenuItem>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Team feedback — not ideas: anything that helps the team improve */}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </header>
  );
}

function MenuItem({
  children,
  icon,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none",
        danger ? "text-gray-900 hover:bg-gray-50" : "text-gray-700 hover:bg-gray-50",
      )}
    >
      {icon}
      {children}
    </DropdownMenu.Item>
  );
}