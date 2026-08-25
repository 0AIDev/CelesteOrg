"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spinner, Eye, EyeSlash, CheckCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={null}>
      <UpdatePasswordForm />
    </Suspense>
  );
}

function UpdatePasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionOk, setSessionOk] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getSession()
      .then(({ data }) => {
        // Recovery links carry the session in the URL hash; the browser client
        // picks it up automatically on load.
        setSessionOk(Boolean(data.session));
      })
      .catch(() => setSessionOk(false))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-[360px]">
        <h1 className="text-center text-[24px] font-bold tracking-tight text-gray-900">
          Set a new password
        </h1>
        <p className="mt-1.5 text-center text-[13px] text-gray-500">
          Choose a strong password to secure your account
        </p>

        <div className="mt-8">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : !sessionOk ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-5 text-center">
              <p className="text-sm font-medium text-gray-900">Invalid or expired link</p>
              <p className="mt-1 text-[13px] text-gray-500">
                This reset link is no longer valid. Request a new one and try again.
              </p>
              <Link
                href="/reset-password"
                className="mt-4 inline-block text-[13px] font-medium text-gray-900 hover:underline"
              >
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-5 text-center">
              <CheckCircle className="mx-auto h-6 w-6 text-gray-900" />
              <p className="mt-2 text-sm font-medium text-gray-900">Password updated</p>
              <p className="mt-1 text-[13px] text-gray-500">
                Sign in with your new password.
              </p>
              <Link
                href="/sign-in"
                className="mt-4 inline-block text-[13px] font-medium text-gray-900 hover:underline"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeSlash className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <label className="mb-1.5 mt-4 block text-[13px] font-medium text-gray-700">
                Confirm password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input"
              />

              {error && (
                <p className="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || password.length === 0 || confirm.length === 0}
                className="mt-6 flex h-10 w-full items-center justify-center rounded-lg bg-gray-900 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-gray-900"
              >
                {submitting ? (
                  <Spinner className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Update password</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
