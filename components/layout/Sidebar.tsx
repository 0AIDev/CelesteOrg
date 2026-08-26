"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { X, Folder, FolderDashed, CaretDown, PushPin, RocketLaunch } from "@phosphor-icons/react";
import {
  categories,
  topNav,
  defaultPinned,
  bottomNav,
  getPinnedItems,
  togglePin,
  type NavItem,
} from "@/components/nav/config";
import { cn } from "@/lib/utils";

// ─── Toggle icons ───────────────────────────────────────────────────
function SidebarExpandIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="10.5" y="6.5" width="7" height="5" rx="1" transform="rotate(90 10.5 6.5)" fill="currentColor" />
      <rect x="3" y="4" width="14" height="12" rx="2.8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SidebarCollapseIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="7" y="6.5" width="7" height="1.5" rx="0.75" transform="rotate(90 7 6.5)" fill="currentColor" />
      <rect x="3" y="4" width="14" height="12" rx="2.8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────────
export function Sidebar({
  open,
  onClose,
  onOpenInvite,
  onOpenStandup,
  isOnboarded,
  dashboards,
}: {
  open: boolean;
  onClose: () => void;
  onOpenInvite?: () => void;
  onOpenStandup?: () => void;
  isOnboarded?: boolean;
  dashboards?: { slug: string; title: string; isOwn?: boolean }[];
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <>
      <aside
        className={cn(
          "relative z-40 flex flex-col overflow-hidden border-r border-gray-200 bg-white/70 backdrop-blur-xl transition-[width,transform] duration-200 ease-in-out",
          isMobile
            ? cn("fixed inset-y-0 left-0 w-[280px] max-w-[85vw]", open ? "translate-x-0" : "-translate-x-full")
            : cn("sticky top-0 h-screen shrink-0", open ? "w-[260px]" : "w-0"),
        )}
      >
        <div className="flex h-full w-[260px] flex-col">
          <SidebarInner
            onClose={onClose}
            onOpenInvite={onOpenInvite}
            onOpenStandup={onOpenStandup}
            isOnboarded={isOnboarded}
            dashboards={dashboards}
          />
        </div>
      </aside>
      {isMobile && open && (
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      )}
    </>
  );
}

// ─── Brand ──────────────────────────────────────────────────────────
function Brand() {
  return (
    <div className="flex items-center px-4 pt-4 pb-3">
      <span className="text-[15px] font-semibold tracking-tight text-gray-950">CelesteHQ</span>
    </div>
  );
}

// ─── Nav item with pin-on-hover ─────────────────────────────────────
function NavItem({
  item,
  active,
  onClick,
  isPinned,
  onTogglePin,
  showPin = false,
}: {
  item: NavItem;
  active?: boolean;
  onClick?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  showPin?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const content = (
    <div
      className={cn(
        "group/nav flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-gray-200/60 text-gray-950"
          : "text-gray-500 hover:bg-gray-100/70 hover:text-gray-950",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <item.icon size={18} weight={active ? "fill" : "regular"} className={cn("shrink-0 transition-colors", active ? "text-gray-950" : "text-gray-400")} />
      <span className="truncate grow">{item.label}</span>
      {item.badge && <span className="text-[11px] text-gray-400">{item.badge}</span>}
      {/* Pin button — appears on hover */}
      {showPin && hovered && onTogglePin && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePin();
          }}
          className={cn(
            "shrink-0 rounded p-0.5 transition-colors",
            isPinned ? "text-gray-900" : "text-gray-300 hover:text-gray-600",
          )}
          title={isPinned ? "Unpin" : "Pin to sidebar"}
        >
          <PushPin size={14} weight={isPinned ? "fill" : "regular"} />
        </button>
      )}
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} onClick={onClick} className="block w-full">
        {content}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}

// ─── Collapsible category ───────────────────────────────────────────
function CategorySection({
  label,
  items,
  pathname,
  navClick,
  pinnedItems,
  onTogglePin,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  navClick: () => void;
  pinnedItems: string[];
  onTogglePin: (label: string) => void;
}) {
  const hasActive = items.some((i) => i.href && pathname.startsWith(i.href));
  const [expanded, setExpanded] = useState(hasActive);

  useEffect(() => {
    if (hasActive) setExpanded(true);
  }, [hasActive]);

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-gray-400 transition-colors hover:text-gray-600"
      >
        <CaretDown
          size={12}
          className={cn("shrink-0 transition-transform duration-150", !expanded && "-rotate-90")}
        />
        <span className="truncate">{label}</span>
      </button>
      {expanded && (
        <div className="space-y-0.5">
          {items.map((item) => (
            <NavItem
              key={item.href ?? item.label}
              item={item}
              active={!!item.href && pathname.startsWith(item.href)}
              onClick={navClick}
              isPinned={pinnedItems.includes(item.label)}
              onTogglePin={() => onTogglePin(item.label)}
              showPin
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inner ──────────────────────────────────────────────────────────
function SidebarInner({
  onClose,
  onOpenInvite,
  onOpenStandup,
  isOnboarded,
  dashboards,
}: {
  onClose: () => void;
  onOpenInvite?: () => void;
  onOpenStandup?: () => void;
  isOnboarded?: boolean;
  dashboards?: { slug: string; title: string; isOwn?: boolean }[];
}) {
  const pathname = usePathname();
  const [inviteDismissed, setInviteDismissed] = useState(false);
  const [pinnedItems, setPinnedItems] = useState<string[]>([]);

  useEffect(() => {
    setPinnedItems(getPinnedItems());
  }, []);

  const handleTogglePin = useCallback((label: string) => {
    const next = togglePin(label);
    setPinnedItems(next);
  }, []);

  function dismissInvite() {
    setInviteDismissed(true);
  }

  function navClick() {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) return;
    onClose();
  }

  // Resolve pinned NavItems
  const allItems = [
    ...topNav,
    ...categories.flatMap((c) => c.items),
    ...defaultPinned,
    ...bottomNav,
  ];
  const pinnedNavItems = pinnedItems
    .map((label) => allItems.find((i) => i.label === label))
    .filter(Boolean) as NavItem[];

  return (
    <>
      {/* Brand + mobile close */}
      <div className="flex items-center justify-between">
        <Brand />
        <button onClick={onClose} className="mr-2 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable nav */}
      <nav className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-3 pb-2">
        {/* Pinned section — always at the top */}
        {pinnedNavItems.length > 0 && (
          <div className="mb-3">
            <p className="mb-1 px-2.5 text-[12px] font-medium text-gray-400">Pinned</p>
            <div className="space-y-0.5">
              {pinnedNavItems.map((item) =>
                item.action === "standup" ? (
                  <NavItem
                    key={item.label}
                    item={item}
                    active={false}
                    onClick={() => {
                      navClick();
                      onOpenStandup?.();
                    }}
                    isPinned
                    onTogglePin={() => handleTogglePin(item.label)}
                    showPin
                  />
                ) : (
                  <NavItem
                    key={item.href ?? item.label}
                    item={item}
                    active={!!item.href && pathname.startsWith(item.href)}
                    onClick={navClick}
                    isPinned
                    onTogglePin={() => handleTogglePin(item.label)}
                    showPin
                  />
                ),
              )}
            </div>
          </div>
        )}

        {/* Top-level items (excluding pinned to avoid duplicates) */}
        <div className="mb-3 space-y-0.5">
          {topNav
            .filter((item) => !pinnedItems.includes(item.label))
            .map((item) => (
              <NavItem
                key={item.href ?? item.label}
                item={item}
                active={!!item.href && pathname.startsWith(item.href)}
                onClick={navClick}
                isPinned={false}
                onTogglePin={() => handleTogglePin(item.label)}
                showPin
              />
            ))}
        </div>

        {/* Collapsible categories (excluding pinned items) */}
        {categories.map((cat) => (
          <CategorySection
            key={cat.label}
            label={cat.label}
            items={cat.items.filter((i) => !pinnedItems.includes(i.label))}
            pathname={pathname}
            navClick={navClick}
            pinnedItems={pinnedItems}
            onTogglePin={handleTogglePin}
          />
        ))}

        {/* Onboarding (hidden if completed) */}
        {!isOnboarded && (
          <div className="mt-3">
            <NavItem
              item={{ label: "Onboarding", href: "/onboarding", icon: RocketLaunch }}
              active={pathname.startsWith("/onboarding")}
              onClick={navClick}
              isPinned={pinnedItems.includes("Onboarding")}
              onTogglePin={() => handleTogglePin("Onboarding")}
              showPin
            />
          </div>
        )}

        {/* Role dashboards */}
        {dashboards && dashboards.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 px-2.5 text-[12px] font-medium text-gray-400">Dashboards</p>
            <div className="space-y-0.5">
              {dashboards.map((d) => (
                <NavItem
                  key={d.slug}
                  item={{
                    label: `${d.title} Dashboard`,
                    href: `/dashboards/${d.slug}`,
                    icon: d.isOwn ? Folder : FolderDashed,
                  }}
                  active={pathname.startsWith(`/dashboards/${d.slug}`)}
                  onClick={navClick}
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom: invite card + nav */}
      <div className="px-3 pb-3">
        {/* Invite card */}
        {!inviteDismissed && onOpenInvite && (
          <div className="group/card relative mb-2">
            <button
              onClick={() => { navClick(); onOpenInvite(); }}
              className="flex w-full items-center gap-2.5 rounded-[14px] border border-gray-200/80 bg-white p-3 text-left transition-all hover:border-gray-300/80 hover:bg-gray-50/80"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]">
                  <path d="M14.1874 3.53647C14.5628 2.46674 13.5339 1.43787 12.4642 1.81326L2.22247 5.40722C1.05947 5.81532 1.00461 7.43953 2.13734 7.92526L6.29334 9.70733L8.07541 13.8633C8.56107 14.9961 10.1853 14.9412 10.5934 13.7782L14.1874 3.53647Z" fill="currentColor" />
                </svg>
              </div>
              <div className="min-w-0 grow px-1">
                <p className="text-[13px] font-medium text-gray-950">Grow your team</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-gray-500">Invite colleagues to Celeste HQ and start collaborating.</p>
              </div>
            </button>
            <button
              aria-label="Dismiss"
              onClick={(e) => { e.stopPropagation(); dismissInvite(); }}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-gray-400 opacity-0 shadow-sm transition-opacity duration-200 group-hover/card:opacity-100 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" width="14" height="14" viewBox="0 0 14 14" style={{ strokeWidth: 1.5 }}>
                <path d="M9.82843 4.17144L7 6.99987M7 6.99987L4.17157 9.8283M7 6.99987L4.17157 4.17144M7 6.99987L9.82843 9.8283" stroke="currentColor" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Bottom nav */}
        <div className="space-y-0.5">
          {bottomNav.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              active={!!item.href && pathname.startsWith(item.href)}
              onClick={navClick}
              isPinned={pinnedItems.includes(item.label)}
              onTogglePin={() => handleTogglePin(item.label)}
              showPin
            />
          ))}
        </div>
      </div>
    </>
  );
}

export { SidebarExpandIcon, SidebarCollapseIcon };
