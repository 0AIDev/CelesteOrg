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
  UsersThree,
  FileText,
  Gauge,
  CalendarBlank,
  ShieldCheck,
  RocketLaunch,
  Sparkle,
  CheckCircle,
  ChatCircleText,
  Coin,
  TreeStructure,
  GithubLogo,
  Bell,
  Notebook,
  Plugs,
} from "@phosphor-icons/react";
import { categories, topNav, defaultPinned, bottomNav, allNavItems, type NavItem } from "@/components/nav/config";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { cn } from "@/lib/utils";
import { getSearchIndex, type SearchIndex } from "@/app/actions/search-actions";

type Action = {
  label: string;
  sub?: string;
  icon: React.ReactNode;
  keywords?: string;
  shortcut?: string;
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

  // Fetch the workspace search index once when the palette opens, so people,
  // documents, ideas, events, roles and approvals are all searchable.
  const [index, setIndex] = useState<SearchIndex | null>(null);
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setIndex(null);
    getSearchIndex().then((res) => {
      if (mounted && res.ok) setIndex(res.index);
    });
    return () => {
      mounted = false;
    };
  }, [open]);

  const quickActions: Action[] = [
    {
      label: "Start Morning Standup",
      sub: "Share today's focus",
      icon: <Sun className="h-[18px] w-[18px] text-gray-500" />,
      keywords: "standup morning report",
      shortcut: "S",
      run: () => {
        onOpenChange(false);
        onOpenStandup();
      },
    },
    {
      label: "Submit EOD Report",
      sub: "Wrap up your day",
      icon: <MoonStars className="h-[18px] w-[18px] text-gray-500" />,
      keywords: "eod evening report end of day",
      shortcut: "E",
      run: () => {
        onOpenChange(false);
        onOpenEod();
      },
    },
    {
      label: "Request Time Off",
      sub: "Vacation · remote · sick",
      icon: <CalendarPlus className="h-[18px] w-[18px] text-gray-500" />,
      keywords: "time off vacation holiday remote sick pto",
      shortcut: "T",
      run: () => {
        onOpenChange(false);
        router.push("/calendar?new=1");
      },
    },
    {
      label: "New Idea",
      sub: "Add to the idea vault",
      icon: <Lightbulb className="h-[18px] w-[18px] text-gray-500" />,
      keywords: "idea suggestion backlog innovation",
      shortcut: "I",
      run: () => {
        onOpenChange(false);
        router.push("/ideas?new=1");
      },
    },
    {
      label: "Invite Teammate",
      sub: "Send a magic link invite",
      icon: <UsersThree className="h-[18px] w-[18px] text-gray-500" />,
      keywords: "invite teammate member colleague email",
      shortcut: "U",
      run: () => {
        onOpenChange(false);
        router.push("/teams?invite=1");
      },
    },
    {
      label: "Ask Celeste AI",
      sub: "Chat with your workspace copilot",
      icon: <ChatCircleText className="h-[18px] w-[18px] text-gray-500" />,
      keywords: "ask ai chat assistant help celeste copilot",
      shortcut: "A",
      run: () => {
        onOpenChange(false);
        // Toggle the Ask AI sidebar — dispatch a custom event
        window.dispatchEvent(new CustomEvent("celeste-toggle-ai"));
      },
    },
    {
      label: "Upload Document",
      sub: "Share files with the team",
      icon: <FileText className="h-[18px] w-[18px] text-gray-500" />,
      keywords: "upload document file share pdf",
      shortcut: "D",
      run: () => {
        onOpenChange(false);
        router.push("/documents?upload=1");
      },
    },
    {
      label: "New Prompt",
      sub: "Add to the Prompt Vault",
      icon: <Notebook className="h-[18px] w-[18px] text-gray-500" />,
      keywords: "prompt vault ai template workflow",
      shortcut: "P",
      run: () => {
        onOpenChange(false);
        router.push("/prompt-vault?new=1");
      },
    },
  ];

  // Dedupe by href — cmdk uses the item value as key, so duplicates would collapse.
  const navItems = [...topNav, ...allNavItems, ...defaultPinned, ...bottomNav]
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
        <Dialog.Content className="pointer-events-auto w-full max-w-[38rem] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl data-[state=open]:animate-fade-in">
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

              <Command.Group heading="Operational" className="px-2 pt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400">
                <CommandItem
                  label="Approve / Reject"
                  sub="/approvals"
                  icon={<CheckCircle size={18} className="text-gray-500" />}
                  keywords="approve reject review approval"
                  onSelect={() => { onOpenChange(false); router.push("/approvals"); }}
                />
                <CommandItem
                  label="CEO Dashboard"
                  sub="/dashboards/ceo"
                  icon={<Gauge size={18} className="text-gray-500" />}
                  keywords="ceo dashboard revenue arr metrics"
                  onSelect={() => { onOpenChange(false); router.push("/dashboards"); }}
                />
                <CommandItem
                  label="Org Chart"
                  sub="/org-chart"
                  icon={<TreeStructure size={18} className="text-gray-500" />}
                  keywords="org chart team structure hierarchy"
                  onSelect={() => { onOpenChange(false); router.push("/org-chart"); }}
                />
                <CommandItem
                  label="GitHub Activity"
                  sub="/github"
                  icon={<GithubLogo size={18} className="text-gray-500" />}
                  keywords="github commits pull requests deploys webhook"
                  onSelect={() => { onOpenChange(false); router.push("/github"); }}
                />
                <CommandItem
                  label="AI Usage"
                  sub="/ai-usage"
                  icon={<Sparkle size={18} className="text-gray-500" />}
                  keywords="ai usage tokens cost provider realtime"
                  onSelect={() => { onOpenChange(false); router.push("/ai-usage"); }}
                />
                <CommandItem
                  label="Notifications"
                  sub="View all notifications"
                  icon={<Bell size={18} className="text-gray-500" />}
                  keywords="notifications alerts"
                  onSelect={() => { onOpenChange(false); router.push("/dashboard"); }}
                />
                <CommandItem
                  label="Equity & Cap Table"
                  sub="/equity"
                  icon={<Coin size={18} className="text-gray-500" />}
                  keywords="equity shares vesting cap table grant"
                  onSelect={() => { onOpenChange(false); router.push("/equity"); }}
                />
                <CommandItem
                  label="Developer Settings"
                  sub="/developers"
                  icon={<Plugs size={18} className="text-gray-500" />}
                  keywords="developer api keys webhooks settings"
                  onSelect={() => { onOpenChange(false); router.push("/developers"); }}
                />
              </Command.Group>

              {index && index.members.length > 0 && (
                <Command.Group heading="People" className="px-2 pt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400">
                  {index.members.map((m) => (
                    <CommandItem
                      key={m.id}
                      label={m.full_name ?? "Unnamed"}
                      sub={m.role_title ? `${m.role_title} · ${m.email}` : m.email}
                      icon={
                        <SquircleAvatar name={m.full_name} src={m.avatar_url} size="sm" />
                      }
                      keywords={`${m.full_name ?? ""} ${m.email} ${m.role_title ?? ""} member teammate people profile`}
                      onSelect={() => {
                        onOpenChange(false);
                        router.push(`/org-chart?member=${m.id}`);
                      }}
                    />
                  ))}
                </Command.Group>
              )}

              {index && index.documents.length > 0 && (
                <Command.Group heading="Documents" className="px-2 pt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400">
                  {index.documents.map((d) => (
                    <CommandItem
                      key={d.id}
                      label={d.title}
                      sub={`${d.category ?? "General"}${d.owner_name ? ` · ${d.owner_name}` : ""}`}
                      icon={<FileText size={18} className="text-gray-500" />}
                      keywords={`${d.title} ${d.category ?? ""} ${d.owner_name ?? ""} document file`}
                      onSelect={() => {
                        onOpenChange(false);
                        router.push(`/documents?doc=${d.id}`);
                      }}
                    />
                  ))}
                </Command.Group>
              )}

              {index && index.roles.length > 0 && (
                <Command.Group heading="Roles" className="px-2 pt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400">
                  {index.roles.map((r) => (
                    <CommandItem
                      key={r.id}
                      label={r.title}
                      sub={r.holder ? `${r.holder} · Dashboard` : "Dashboard"}
                      icon={<Gauge size={18} className="text-gray-500" />}
                      keywords={`${r.title} ${r.holder ?? ""} role dashboard position`}
                      onSelect={() => {
                        onOpenChange(false);
                        router.push(`/dashboards/${r.id}`);
                      }}
                    />
                  ))}
                </Command.Group>
              )}

              {index && index.ideas.length > 0 && (
                <Command.Group heading="Ideas" className="px-2 pt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400">
                  {index.ideas.map((i) => (
                    <CommandItem
                      key={i.id}
                      label={i.title}
                      sub="Idea vault"
                      icon={<Lightbulb size={18} className="text-gray-500" />}
                      keywords={`${i.title} idea vault suggestion`}
                      onSelect={() => {
                        onOpenChange(false);
                        router.push(`/ideas?idea=${i.id}`);
                      }}
                    />
                  ))}
                </Command.Group>
              )}

              {index && index.events.length > 0 && (
                <Command.Group heading="Events" className="px-2 pt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400">
                  {index.events.map((e) => (
                    <CommandItem
                      key={e.id}
                      label={e.title}
                      sub={`${fmtEventTime(e.start_time)} · ${typeLabel(e.type)}`}
                      icon={<CalendarBlank size={18} className="text-gray-500" />}
                      keywords={`${e.title} ${e.type} event calendar`}
                      onSelect={() => {
                        onOpenChange(false);
                        router.push(`/calendar?event=${e.id}`);
                      }}
                    />
                  ))}
                </Command.Group>
              )}

              {index && index.approvals.length > 0 && (
                <Command.Group heading="Approvals" className="px-2 pt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400">
                  {index.approvals.map((a) => (
                    <CommandItem
                      key={a.id}
                      label={a.summary}
                      sub={`${a.status} · Approvals`}
                      icon={<ShieldCheck size={18} className="text-gray-500" />}
                      keywords={`${a.summary} ${a.status} approval approve`}
                      onSelect={() => {
                        onOpenChange(false);
                        router.push(`/approvals?approval=${a.id}`);
                      }}
                    />
                  ))}
                </Command.Group>
              )}
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
  shortcut,
  onSelect,
}: {
  label: string;
  sub?: string;
  icon: React.ReactNode;
  keywords?: string;
  shortcut?: string;
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
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium text-gray-900">{label}</span>
        {sub && <span className="truncate text-xs text-gray-400">{sub}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 pl-2 pr-1 text-xs font-medium text-gray-400 group-data-[selected=true]:text-gray-500">
        {shortcut && (
          <kbd className="hidden h-5 w-5 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-400 group-data-[selected=true]:sm:flex">
            {shortcut}
          </kbd>
        )}
        <span className="hidden text-gray-400 group-data-[selected=true]:sm:inline">Open</span>
        <ArrowUUpLeft className="hidden h-3 w-3 text-gray-400 group-data-[selected=true]:sm:block" />
      </div>
    </Command.Item>
  );
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    vacation: "Vacation",
    remote: "Remote",
    sick: "Sick leave",
    meeting: "Meeting",
  };
  return map[type] ?? type;
}

function fmtEventTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
