"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Spinner, Envelope, X } from "@phosphor-icons/react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { inviteTeammate, getDepartments } from "@/app/actions/invite-actions";

type Dept = { id: string; name: string };

export function InviteModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<
    { link: string; token: string; email: string } | null
  >(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setEmail("");
    setRoleTitle("");
    setDepartmentId("");
    setErr("");
    getDepartments().then((res) => {
      if (res.ok) setDepartments(res.departments);
      else setErr(res.error);
    });
  }, [open]);

  if (!open) return null;

  async function submit() {
    setSending(true);
    setErr("");
    const res = await inviteTeammate({
      email,
      departmentId: departmentId || undefined,
      roleTitle: roleTitle || undefined,
    });
    setSending(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    if (res.link && res.token) {
      setResult({ link: res.link, token: res.token, email: email.toLowerCase() });
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard API may be unavailable; the link is shown inline regardless.
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Invite a teammate</h3>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {result ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-900">
              <Check className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Invite generated</p>
            <p className="mt-1 text-xs text-gray-500">
              Share this magic link with{" "}
              <span className="font-medium text-gray-700">{result.email}</span>. It signs them
              in and auto-assigns their department and role.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1 pl-3">
              <Envelope className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="min-w-0 flex-1 truncate text-left text-xs text-gray-600 break-all">
                {result.link}
              </span>
              <button
                onClick={copy}
                className="btn-secondary shrink-0 !px-2.5 !py-1.5"
                aria-label="Copy invite link"
              >
                {copied ? <Check className="h-4 w-4 text-gray-900" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
              <Envelope className="h-3 w-3" />
              An email invite is also sent once SMTP is configured in Supabase.
            </div>
            <button onClick={onClose} className="btn-secondary mt-5">
              Done
            </button>
          </div>
        ) : (
          <>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@celeste.ai"
              className="input"
              autoFocus
            />

            <label className="mb-1.5 mt-4 block text-[13px] font-medium text-gray-700">
              Department <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <CustomSelect
              value={departmentId}
              onValueChange={setDepartmentId}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              placeholder="Select a department…"
            />

            <label className="mb-1.5 mt-4 block text-[13px] font-medium text-gray-700">
              Position <span className="font-normal text-gray-400">(shows on the org chart)</span>
            </label>
            <input
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Senior Engineer"
              className="input"
            />

            {err && <p className="mt-3 text-xs text-gray-600">{err}</p>}

            <div className="mt-5 flex items-center justify-between gap-2">
              <button onClick={onClose} className="px-2 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={
                  sending ||
                  !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
                  roleTitle.trim().length === 0
                }
                className="btn-primary disabled:opacity-50"
              >
                {sending ? <Spinner className="h-4 w-4 animate-spin" /> : <Envelope className="h-4 w-4" />}
                Send invite
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}