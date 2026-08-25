"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import {
  MagnifyingGlass,
  Sun,
  MoonStars,
  Lightbulb,
  CalendarPlus,
  ArrowUUpLeft,
} from "@phosphor-icons/react";
import { mainNav, shortcuts, bottomNav, type NavItem } from "@/components/nav/config";
import { cn } from "@/lib/utils";

type Action = {
  label: string;
  sub?: string;
  icon: React.ReactNode;
  keywords?: string;
  run: () => void;
};

export function CommandMenu({
  open,
  onOpenChange,
  onOpenStandup,
  onOpenEod,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenStandup: () => void;
  onOpenEod: () => void;
}) {
  const router = useRouter();
  const openRef = useRef(open);
  openRef.current = open;

  // Global ⌘K / Ctrl+K — opens the palette from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!openRef.current);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  const quickActions: Action[] = [
    {
      label: "Start Morning Standup",
      sub: "Share today's focus",
      icon: <Sun className="h-[18px] w-[18px] text-gray-500" />,
      keywords: "standup morning report",
      run: () => {
        onOpenChange(false);
        onOpenStandup();
      },
    },
    {
      label: "Submit EOD report",
      sub: "Wrap up your day",
      icon: <MoonStars className="h-[18px] w-[18px] text-gray-500" />,
      keywords: "eod evening report",
      run: () => {
        onOpenChange(false);
        onOpenEod();
      },
    },
    {
      label: "New Idea",
      sub: "Add to the vault",
      icon: <Lightbulb className="h-[18px] w-[18px] text-gray-500" />,
      keywords: "idea suggestion backlog",
      run: () => {
        onOpenChange(false);
        router.push("/ideas?new=1");
      },
    },
    {
      label: "Request Time Off",
      sub: "Vacation · remote · sick",
      icon: <CalendarPlus className="h-[18px] w-[18px] text-gray-500" />,
      keywords: "time off vacation holiday remote sick",
      run: () => {
        onOpenChange(false);
        router.push("/calendar?new=1");
      },
    },
  ];

  // Dedupe by href (Approvals appears in both mainNav and shortcuts) — cmdk
  // uses the item value as key, so duplicates would collapse into one row.
  const navItems = [...mainNav, ...shortcuts, ...bottomNav]
    .filter((n): n is NavItem & { href: string } => !!n.href)
    .filter((n, i, arr) => arr.findIndex((x) => x.href === n.href) === i);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Blurred backdrop — the app behind stays visible but out of focus */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-md data-[state=open]:animate-fade-in" />
        {/* Always perfectly centered — flex centering on the wrapper avoids
            transform conflicts with the fade-in animation */}
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <Dialog.Content className="pointer-events-auto w-full max-w-[38rem] overflow-hidden rounded-2xl border border-gray-200 bg-white/85 shadow-2xl backdrop-blur-xl data-[state=open]:animate-fade-in">
          <Command className="flex h-full w-full flex-col overflow-hidden rounded-2xl text-gray-900">
            {/* Input */}
            <div className="group flex h-[54px] items-center gap-2.5 border-b border-gray-100 px-4">
              <MagnifyingGlass className="h-[18px] w-[18px] shrink-0 text-gray-400 group-focus-within:text-gray-700" />
              <Command.Input
                placeholder="Search actions, pages, people..."
                className="h-10 w-full rounded-md border-none bg-transparent py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                autoFocus
              />
              <kbd className="shrink-0 rounded-md border border-gray-200 bg-gray-50 px-1.5 text-[10px] font-medium text-gray-400">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <Command.List className="no-scrollbar max-h-[min(416px,60vh)] overflow-y-auto overflow-x-hidden px-0.5 py-1.5">
              <Command.Empty className="px-4 py-10 text-center text-sm text-gray-400">
                No results found.
              </Command.Empty>

              <Command.Group heading="Quick actions" className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400">
                {quickActions.map((a) => (
                  <CommandItem
                    key={a.label}
                    label={a.label}
                    sub={a.sub}
                    icon={a.icon}
                    keywords={a.keywords}
                    onSelect={a.run}
                  />
                ))}
              </Command.Group>

              <Command.Group heading="Navigate" className="px-2 pt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400">
                {navItems.map((n) => {
                  const Icon = n.icon;
                  return (
                    <CommandItem
                      key={n.href}
                      label={n.label}
                      sub={n.href}
                      icon={<Icon size={18} className="text-gray-500" />}
                      keywords={n.label}
                      onSelect={() => {
                        onOpenChange(false);
                        router.push(n.href!);
                      }}
                    />
                  );
                })}
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CommandItem({
  label,
  sub,
  icon,
  keywords,
  onSelect,
}: {
  label: string;
  sub?: string;
  icon: React.ReactNode;
  keywords?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={`${label} ${sub ?? ""} ${keywords ?? ""}`.toLowerCase()}
      onSelect={onSelect}
      className="group relative flex cursor-pointer select-none items-center gap-3 rounded-xl p-1.5 px-2 py-1.5 text-sm text-gray-700 outline-none data-[selected=true]:bg-gray-100 data-[selected=true]:text-gray-900"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gray-100 text-gray-600 transition-colors group-data-[selected=true]:bg-gray-200/70">
        {icon}
      </div>
      <div className="flex min-w-0 max-w-[60%] flex-col">
        <span className="truncate font-medium text-gray-900">{label}</span>
        {sub && <span className="truncate text-xs text-gray-400">{sub}</span>}
      </div>
      <div className="ml-auto hidden shrink-0 items-center gap-1.5 pl-2 pr-1 text-xs font-medium text-gray-500 group-data-[selected=true]:flex">
        <span>Open</span>
        <kbd className="flex h-5 w-fit shrink-0 items-center rounded-md border border-gray-200 bg-white px-1 font-medium text-gray-400">
          <ArrowUUpLeft className="h-3 w-3" />
        </kbd>
      </div>
    </Command.Item>
  );
}
