"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Crown, ArrowClockwise, Prohibit, Check, Spinner, Envelope } from "@phosphor-icons/react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { relativeTime } from "@/lib/utils";
import {
  getInvites,
  revokeInvite,
  resendInvite,
  bootstrapFounderAction,
  type InviteRow,
} from "@/app/actions/invite-actions";

export function TeamsInvitesPanel({
  canManage,
  canBootstrap,
}: {
  canManage: boolean;
  canBootstrap: boolean;
}) {
  const router = useRouter();
  const [invites, setInvites] = useState<InviteRow[] | null>(null);
  const [loading, setLoading] = useState(canManage);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  // Bootstrap state
  const [bootstrapBusy, setBootstrapBusy] = useState(false);
  const [bootstrapMsg, setBootstrapMsg] = useState<string | null>(null);

  async function load() {
    if (!canManage) return;
    setLoading(true);
    const res = await getInvites();
    setLoading(false);
    if (res.ok) setInvites(res.invites);
    else setErr(res.error);
  }

  useEffect(() => {
    if (canManage) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  async function onRevoke(id: string) {
    setBusy(id);
    setErr("");
    const res = await revokeInvite(id);
    setBusy(null);
    if (!res.ok) setErr(res.error);
    else router.refresh();
  }

  async function onResend(id: string) {
    setBusy(id);
    setErr("");
    const res = await resendInvite(id);
    setBusy(null);
    if (!res.ok) {
      setErr(res.error);
    } else if (res.link) {
      try {
        await navigator.clipboard.writeText(res.link);
        setErr("");
        alert("New invite link copied to clipboard.");
      } catch {
        alert(`New invite link: ${res.link}`);
      }
    }
  }

  async function onBootstrap() {
    setBootstrapBusy(true);
    setBootstrapMsg(null);
    const res = await bootstrapFounderAction();
    setBootstrapBusy(false);
    if (!res.ok) {
      setBootstrapMsg(`Failed: ${res.error}`);
      return;
    }
    if (res.claimed) {
      setBootstrapMsg("You are now the first founder of Celeste.");
      router.refresh();
      return;
    }
    setBootstrapMsg(
      "This can only be claimed by the first-created admin account before any founder exists — for later founders, ask a current founder or admin on the org chart.",
    );
  }

  if (!canManage) return null;

  return (
    <div className="mt-10">
      {canBootstrap && (
        <Card className="mb-6 border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <Crown className="h-5 w-5 shrink-0 text-gray-900" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900">Bootstrap the first founder</p>
              <p className="text-sm text-gray-500">
                No founder exists yet. As the oldest admin, you can claim the founder
                role to unlock invites and equity management.
              </p>
            </div>
            <button
              onClick={onBootstrap}
              disabled={bootstrapBusy}
              className="btn-primary disabled:opacity-50"
            >
              {bootstrapBusy ? <Spinner className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
              Make me founder
            </button>
          </div>
          {bootstrapMsg && <p className="mt-3 text-sm text-gray-600">{bootstrapMsg}</p>}
        </Card>
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-gray-900" />
            <h2 className="text-sm font-semibold text-gray-900">Manage invites</h2>
          </div>
          {invites && (
            <button onClick={() => load()} className="btn-ghost !py-1.5 !px-2 text-xs">
              <ArrowClockwise className="h-3.5 w-3.5" /> Refresh
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : invites && invites.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            No invites yet. Use the sidebar “Invite teammates” to send one.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {invites?.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                  <Envelope className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{inv.email}</p>
                  <p className="text-xs text-gray-400">
                    {inv.role_title ?? "Teammate"}
                    {inv.departmentName ? ` · ${inv.departmentName}` : ""} · {relativeTime(inv.created_at)}
                  </p>
                </div>
                <Badge tone="neutral">
                  {inv.status}
                </Badge>
                {inv.status === "pending" && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onResend(inv.id)}
                      disabled={busy === inv.id}
                      className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      title="Resend / copy link"
                    >
                      <ArrowClockwise className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onRevoke(inv.id)}
                      disabled={busy === inv.id}
                      className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      title="Revoke invite"
                    >
                      <Prohibit className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {err && <p className="mt-3 text-xs text-gray-600">{err}</p>}
      </Card>
    </div>
  );
}

function SkeletonRow() {
  return <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />;
}