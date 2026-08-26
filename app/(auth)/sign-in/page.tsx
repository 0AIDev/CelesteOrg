"use client";

import { Suspense, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Spinner, Eye, EyeSlash } from "@phosphor-icons/react";
import { loginAction, type AuthActionState } from "@/app/actions/auth-actions";

const initialState: AuthActionState | null = null;

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [state, formAction] = useFormState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ssoNote, setSsoNote] = useState<string | null>(null);
  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-[360px]">
        <h1 className="text-center text-[24px] font-bold tracking-tight text-gray-900">
          Sign in
        </h1>
        <p className="mt-1.5 text-center text-[13px] text-gray-500">
          Welcome back to Celeste
        </p>

        {/* SSO button — no GitHub, no Google, no Apple */}
        <button
          type="button"
          onClick={() =>
            setSsoNote(
              "SSO is not configured for this workspace yet. Sign in with email and password for now.",
            )
          }
          className="mt-8 flex h-10 w-full items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
        >
          Sign in with SSO
        </button>

        {ssoNote && (
          <p className="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-center text-xs text-gray-600">
            {ssoNote}
          </p>
        )}

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form action={formAction}>
          <input type="hidden" name="next" value={next} />

          {/* Email */}
          <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            name="email"
            placeholder="you@celeste.ai"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
          {state?.fieldErrors?.email && (
            <p className="mt-1 text-xs text-gray-600">
              {state.fieldErrors.email[0]}
            </p>
          )}

          {/* Password + forgot link */}
          <div className="relative mt-4">
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
              Password
            </label>
            <Link
              href="/reset-password"
              className="absolute right-0 top-1 text-xs font-medium text-gray-400 no-underline underline-offset-2 decoration-gray-300 transition-all duration-150 ease-out hover:decoration-current hover:text-gray-700 hover:underline"
            >
              Forgot your password?
            </Link>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                autoComplete="current-password"
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
          </div>
          {state?.fieldErrors?.password && (
            <p className="mt-1 text-xs text-gray-600">
              {state.fieldErrors.password[0]}
            </p>
          )}

          {state && !state.ok && state.error && !state.fieldErrors && (
            <p className="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700">
              {state.error}
            </p>
          )}

          <SubmitButton disabled={!canSubmit} />
        </form>

        <p className="mt-6 text-center text-[13px] text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/onboarding" className="font-medium text-gray-900 hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const inactive = pending || disabled;
  return (
    <button
      type="submit"
      disabled={inactive}
      className="mt-6 flex h-10 w-full items-center justify-center rounded-lg bg-gray-900 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-gray-900"
    >
      {pending ? (
        <Spinner className="h-4 w-4 animate-spin" />
      ) : (
        <span>Sign in</span>
      )}
    </button>
  );
}
