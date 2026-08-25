"use client";

import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useRouter } from "next/navigation";
import {
  UserCircle,
  ShieldCheck,
  Bell,
  Spinner,
  Check,
  Key,
  Eye,
  EyeSlash,
  Camera,
} from "@phosphor-icons/react";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { FileUpload } from "@/components/ui/FileUpload";
import { Input } from "./Input";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, changePassword } from "@/app/actions/settings-actions";

type Profile = {
  full_name: string;
  bio: string | null;
  location: string | null;
  previous_companies: string[];
  avatar_url: string | null;
};

const TABS = [
  { value: "profile", label: "Profile", icon: UserCircle },
  { value: "security", label: "Security", icon: ShieldCheck },
  { value: "notifications", label: "Notifications", icon: Bell },
];

export function SettingsClient({
  profile,
}: {
  profile: Profile | null;
}) {
  const router = useRouter();
  const [companyText, setCompanyText] = useState(
    (profile?.previous_companies ?? []).join(", "),
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-xl font-semibold tracking-tight text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">Manage your account and vesting.</p>

      <Tabs.Root defaultValue="profile" className="mt-6">
        <Tabs.List className="flex gap-5 border-b border-gray-200" aria-label="Settings">
          {TABS.map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className={`tab data-[state=active]:text-gray-900 data-[state=active]:after:bg-gray-900`}
            >
              <span className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="mt-6">
          <Tabs.Content value="profile">
            <ProfileTab
              profile={profile}
              companyText={companyText}
              setCompanyText={setCompanyText}
              onSaved={() => router.refresh()}
            />
          </Tabs.Content>
          <Tabs.Content value="security">
            <SecurityTab />
          </Tabs.Content>
          <Tabs.Content value="notifications">
            <NotificationsTab />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}

function ProfileTab({
  profile,
  companyText,
  setCompanyText,
  onSaved,
}: {
  profile: Profile | null;
  companyText: string;
  setCompanyText: (s: string) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(profile?.full_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);

  // Upload a new profile photo to the (public) avatars bucket, then persist
  // the public URL on the profile. Writes are storage-policy-locked to the
  // user's own folder (avatars/<user-id>/...).
  async function handleAvatar(file: File) {
    if (!file.type.startsWith("image/")) {
      setErr("Scegli un'immagine (JPG, PNG, WebP…).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErr("La foto deve essere al massimo 2 MB.");
      return;
    }
    setUploading(true);
    setErr("");
    try {
      const sb = createClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error("Non autenticato.");

      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/${Date.now()}-avatar.${ext}`;
      const { error: upErr } = await sb.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw new Error(upErr.message);

      const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);
      const res = await updateProfile({ avatar_url: pub.publicUrl });
      if (!res.ok) throw new Error(res.error);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload fallito.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setErr("");
    const companies = companyText
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const res = await updateProfile({ full_name: name, bio, location, previous_companies: companies });
    setSaving(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
    onSaved();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <FileUpload
          accept="image/*"
          onFile={handleAvatar}
          disabled={uploading}
        >
          {(open) => (
            <button
              type="button"
              onClick={open}
              disabled={uploading}
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full focus:outline-none focus:ring-2 focus:ring-gray-900/30"
              aria-label="Cambia foto profilo"
              title="Cambia foto profilo"
            >
              <SquircleAvatar
                name={profile?.full_name}
                src={profile?.avatar_url}
                size="lg"
                className="h-full w-full"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity hover:opacity-100 disabled:opacity-100">
                {uploading ? (
                  <Spinner className="h-5 w-5 animate-spin" />
                ) : (
                  <Camera className="h-5 w-5" />
                )}
              </span>
            </button>
          )}
        </FileUpload>
        <div>
          <p className="font-medium text-gray-900">{profile?.full_name}</p>
          <p className="text-xs text-gray-500">
            Clicca sull&apos;avatar per cambiare foto (max 2 MB).
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Full name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Location</label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Remote · Europe" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
            Previous companies <span className="font-normal text-gray-400">(comma-separated)</span>
          </label>
          <Input value={companyText} onChange={(e) => setCompanyText(e.target.value)} placeholder="Acme, Globex" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="A short intro for the org chart…"
            className="input resize-none"
          />
        </div>
      </div>

      {err && <p className="text-xs text-gray-600">{err}</p>}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving || !name} className="btn-primary disabled:opacity-50">
          {saving ? <Spinner className="h-4 w-4 animate-spin" /> : "Save changes"}
        </button>
        {done && (
          <span className="flex items-center gap-1 text-sm text-gray-900">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}

function SecurityTab() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [show, setShow] = useState(false);

  async function save() {
    setSaving(true);
    setErr("");
    const res = await changePassword({ currentPassword: current, newPassword: next });
    setSaving(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setCurrent("");
    setNext("");
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <div className="space-y-4">
      <SectionTitle icon={<Key className="h-4 w-4" />} title="Change password" />
      <div className="relative">
        <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Current password</label>
        <Input
          type={show ? "text" : "password"}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="••••••••"
        />
        <button
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-gray-700">New password</label>
        <Input
          type={show ? "text" : "password"}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="8+ characters"
        />
      </div>

      <SectionTitle icon={<ShieldCheck className="h-4 w-4" />} title="Active sessions" />
      <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">This device</p>
          <p className="text-xs text-gray-400">Current browser session · active now</p>
        </div>
        <span className="badge bg-gray-100 text-gray-600">Active</span>
      </div>

      {err && <p className="text-xs text-gray-600">{err}</p>}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving || !current || next.length < 8} className="btn-primary disabled:opacity-50">
          {saving ? <Spinner className="h-4 w-4 animate-spin" /> : "Update password"}
        </button>
        {done && (
          <span className="flex items-center gap-1 text-sm text-gray-900">
            <Check className="h-4 w-4" /> Updated
          </span>
        )}
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState([
    { key: "approvals", label: "Approval requests", desc: "When someone needs your sign-off", on: true },
    { key: "standup", label: "Morning standup reminders", desc: "Daily 9am prompt", on: true },
    { key: "eod", label: "EOD reminders", desc: "Daily 5pm prompt to wrap up", on: true },
    { key: "ideas", label: "New ideas", desc: "High-signal ideas from the vault", on: false },
  ]);

  return (
    <div className="card divide-y divide-gray-100">
      {prefs.map((p) => (
        <div key={p.key} className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-gray-900">{p.label}</p>
            <p className="text-xs text-gray-400">{p.desc}</p>
          </div>
          <Toggle on={p.on} onToggle={() => setPrefs((ps) => ps.map((x) => (x.key === p.key ? { ...x, on: !x.on } : x)))} />
        </div>
      ))}
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-gray-900" : "bg-gray-200"}`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
      <span className="text-gray-400">{icon}</span>
      {title}
    </div>
  );
}