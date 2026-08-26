"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Crown,
  ShieldCheck,
  UsersThree,
  Check,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Badge } from "@/components/ui/Badge";
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_GROUP,
  type PermissionKey,
} from "@/lib/permissions";
import {
  setUserPermission,
  setUserRole,
  setFounderStatus,
  setAdminStatus,
  removeUserFromWorkspace,
} from "@/app/actions/permission-actions";
import type { TeamPermissionRow } from "@/app/actions/permission-actions";
import { cn } from "@/lib/utils";

export function PermissionsManager({
  initial,
  currentUserId,
  viewerIsFounder,
}: {
  initial: TeamPermissionRow[];
  currentUserId: string | null;
  viewerIsFounder: boolean;
}) {
  const [members, setMembers] = useState<TeamPermissionRow[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.find((m) => m.id === currentUserId)?.id ?? initial[0]?.id ?? null,
  );
  const [query, setQuery] = useState("");
  const [live, setLive] = useState(false);

  // Realtime — like Discord: every toggle propagates instantly to the CEO view.
  useEffect(() => {
    const sb = createClient();
    const channel = sb.channel("celeste-permissions");

    const upsertMember = (id: string, patch: Partial<TeamPermissionRow>) =>
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_permissions" },
        (payload) => {
          const { user_id: uid, feature, allowed } = (payload.new ?? payload.old) as {
            user_id: string;
            feature: PermissionKey;
            allowed: boolean;
          };
          const isDelete = payload.eventType === "DELETE";
          setMembers((prev) =>
            prev.map((m) => {
              if (m.id !== uid) return m;
              const next = { ...m.permissions };
              if (isDelete) delete next[feature];
              else next[feature] = allowed;
              return { ...m, permissions: next };
            }),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const n = payload.new as Record<string, unknown>;
          upsertMember(n.id as string, {
            full_name: (n.full_name as string) ?? null,
            avatar_url: (n.avatar_url as string) ?? null,
            role_title: (n.role_title as string) ?? null,
            is_founder: (n.is_founder as boolean) ?? false,
          });
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const selected = useMemo(
    () => members.find((m) => m.id === selectedId) ?? null,
    [members, selectedId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role_title?.toLowerCase().includes(q),
    );
  }, [members, query]);

  // ── Actions (optimistic) ──────────────────────────────────────────────
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function togglePerm(member: TeamPermissionRow, key: PermissionKey, allowed: boolean) {
    setError(null);
    const prev = member.permissions[key];
    setMembers((ms) =>
      ms.map((m) =>
        m.id === member.id
          ? { ...m, permissions: { ...m.permissions, [key]: allowed } }
          : m,
      ),
    );
    const res = await setUserPermission(member.id, key, allowed);
    if (!res.ok) {
      setMembers((ms) =>
        ms.map((m) =>
          m.id === member.id
            ? { ...m, permissions: { ...m.permissions, [key]: prev } }
            : m,
        ),
      );
      setError(res.error);
    }
  }

  async function saveRole(member: TeamPermissionRow, roleTitle: string) {
    setError(null);
    setMembers((ms) => ms.map((m) => (m.id === member.id ? { ...m, role_title: roleTitle } : m)));
    const res = await setUserRole(member.id, roleTitle);
    if (!res.ok) {
      setMembers((ms) => ms.map((m) => (m.id === member.id ? { ...m, role_title: member.role_title } : m)));
      setError(res.error);
    }
  }

  async function toggleFounder(member: TeamPermissionRow, value: boolean) {
    setError(null);
    setMembers((ms) => ms.map((m) => (m.id === member.id ? { ...m, is_founder: value } : m)));
    const res = await setFounderStatus(member.id, value);
    if (!res.ok) {
      setMembers((ms) => ms.map((m) => (m.id === member.id ? { ...m, is_founder: member.is_founder } : m)));
      setError(res.error);
    }
  }

  async function toggleAdmin(member: TeamPermissionRow, value: boolean) {
    setError(null);
    setMembers((ms) => ms.map((m) => (m.id === member.id ? { ...m, is_admin: value } : m)));
    const res = await setAdminStatus(member.id, value);
    if (!res.ok) {
      setMembers((ms) => ms.map((m) => (m.id === member.id ? { ...m, is_admin: member.is_admin } : m)));
      setError(res.error);
    }
  }

  const isSelf = (id: string) => id === currentUserId;
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function handleRemove() {
    if (!selected) return;
    setRemoving(true);
    const res = await removeUserFromWorkspace(selected.id);
    setRemoving(false);
    setConfirmRemove(false);
    if (res.ok) {
      setMembers((ms) => ms.filter((m) => m.id !== selected.id));
      setSelectedId(null);
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="card mt-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-gray-900" />
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">Roles &amp; Permissions</h2>
            <p className="text-[11.5px] text-gray-400">
              Set roles and feature access for every teammate — changes apply in realtime.
            </p>
          </div>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
            live ? "border-gray-300 bg-gray-100 text-gray-700" : "border-gray-200 bg-gray-50 text-gray-500",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", live ? "animate-pulse bg-gray-900" : "bg-gray-400")} />
          {live ? "Live" : "Connecting…"}
        </span>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr]">
        {/* Member list */}
        <div className="border-b border-gray-100 lg:border-b-0 lg:border-r">
          <div className="border-b border-gray-100 p-2.5">
            <div className="relative">
              <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search members…"
                className="input h-8 pl-8 text-[12.5px]"
              />
            </div>
          </div>
          <div className="max-h-[30rem] overflow-y-auto p-1.5">
            {filtered.length === 0 && (
              <p className="px-3 py-8 text-center text-xs text-gray-400">No members found.</p>
            )}
            {filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
                  selectedId === m.id ? "bg-gray-100" : "hover:bg-gray-50",
                )}
              >
                <SquircleAvatar name={m.full_name} src={m.avatar_url} size="xs" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium text-gray-900">
                      {m.full_name ?? "Unnamed"}
                    </span>
                    {m.is_founder && <Crown className="h-3 w-3 shrink-0 text-gray-900" weight="fill" />}
                    {m.is_admin && <ShieldCheck className="h-3 w-3 shrink-0 text-gray-600" weight="fill" />}
                  </span>
                  <span className="block truncate text-[11px] text-gray-400">
                    {m.role_title || m.email}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected member panel */}
        <div className="min-h-[24rem]">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-gray-400">
              <UsersThree className="h-6 w-6" />
              <p className="mt-2 text-sm">Select a member to manage their access.</p>
            </div>
          ) : (
            <div className="p-4">
              {/* Identity + role */}
              <div className="flex flex-wrap items-center gap-3">
                <SquircleAvatar name={selected.full_name} src={selected.avatar_url} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
                    {selected.full_name ?? "Unnamed"}
                    {selected.is_founder && <Badge tone="neutral">Founder</Badge>}
                    {selected.is_admin && <Badge tone="neutral">Admin</Badge>}
                  </p>
                  <p className="truncate text-xs text-gray-400">{selected.email}</p>
                </div>
              </div>

              {/* Role title */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-medium text-gray-500">Role</span>
                  <input
                    key={selected.id + "-role"}
                    defaultValue={selected.role_title ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (selected.role_title ?? "")) saveRole(selected, v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    placeholder="e.g. Senior Engineer"
                    className="input h-9 text-[13px]"
                  />
                </label>
                <div className="flex items-end gap-2">
                  <label className="flex flex-1 items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                    <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-gray-700">
                      <Crown className="h-3.5 w-3.5" /> Founder
                    </span>
                    <Toggle
                      checked={selected.is_founder}
                      disabled={isSelf(selected.id) || !viewerIsFounder}
                      onChange={(v) => toggleFounder(selected, v)}
                    />
                  </label>
                  <label className="flex flex-1 items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                    <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-gray-700">
                      <ShieldCheck className="h-3.5 w-3.5" /> Admin
                    </span>
                    <Toggle
                      checked={selected.is_admin}
                      disabled={isSelf(selected.id) || !viewerIsFounder}
                      onChange={(v) => toggleAdmin(selected, v)}
                    />
                  </label>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">
                Founders bypass all feature toggles. Admins are restricted like everyone else. Only the founder can change founder/admin status — and never their own.
              </p>

              {error && (
                <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] text-gray-600">
                  {error}
                </p>
              )}

              {/* Remove from workspace */}
              {!isSelf(selected.id) && !selected.is_founder && (
                <div className="mt-5 border-t border-gray-100 pt-4">
                  {!confirmRemove ? (
                    <button
                      onClick={() => setConfirmRemove(true)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-[12.5px] font-medium text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      Remove from workspace
                    </button>
                  ) : (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-[13px] font-medium text-red-700">
                        Remove {selected.full_name ?? "this person"}?
                      </p>
                      <p className="mt-1 text-[11.5px] text-red-500">
                        They will lose access to CelesteHQ immediately. This cannot be undone.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => setConfirmRemove(false)}
                          className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={removing}
                          onClick={handleRemove}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {removing ? "Removing…" : "Remove"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Permission matrix */}
              <div className="mt-5">
                <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-gray-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Feature access
                </p>
                <div className="space-y-4">
                  {PERMISSION_GROUPS.map((group) => {
                    const items = PERMISSIONS.filter((p) => PERMISSION_GROUP[p.key] === group);
                    return (
                      <div key={group}>
                        <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-gray-300">
                          {group}
                        </p>
                        <div className="divide-y divide-gray-50 rounded-xl border border-gray-100">
                          {items.map((p) => {
                            const value = selected.permissions[p.key] ?? true; // absent = allowed
                            const disabled = selected.is_founder;
                            return (
                              <div
                                key={p.key}
                                className="flex items-center justify-between gap-3 px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-[13px] font-medium text-gray-800">{p.label}</p>
                                  <p className="truncate text-[11.5px] text-gray-400">{p.description}</p>
                                </div>
                                <Toggle
                                  checked={value}
                                  disabled={disabled}
                                  onChange={(v) => togglePerm(selected, p.key, v)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-400">
                  <Check className="h-3 w-3" />
                  {selected.is_founder
                    ? "Founders bypass all toggles — this matrix is locked for them."
                    : "Off = restricted for this member. Missing rows default to allowed."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Minimal monochrome switch ─────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300",
        checked ? "bg-gray-900" : "bg-gray-200",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}
