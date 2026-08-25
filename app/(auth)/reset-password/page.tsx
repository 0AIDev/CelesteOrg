"use client";

import { Suspense, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Spinner } from "@phosphor-icons/react";
import { resetPasswordAction, type AuthActionState } from "@/app/actions/auth-actions";

const initialState: AuthActionState | null = null;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const [state, formAction] = useFormState(resetPasswordAction, initialState);
  const [email, setEmail] = useState("");
  const sent = state?.ok === true;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-[360px]">
        <h1 className="text-center text-[24px] font-bold tracking-tight text-gray-900">
          Reset password
        </h1>
        <p className="mt-1.5 text-center text-[13px] text-gray-500">
          Enter your email and we&apos;ll send you a reset link
        </p>

        {sent ? (
          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 px-4 py-5 text-center">
            <p className="text-sm font-medium text-gray-900">Check your email</p>
            <p className="mt-1 text-[13px] text-gray-500">
              If an account exists for{" "}
              <span className="font-medium text-gray-800">{email}</span>, a reset
              link is on its way.
            </p>
            <Link
              href="/sign-in"
              className="mt-4 inline-block text-[13px] font-medium text-gray-900 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form action={formAction} className="mt-8">
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

            {state?.error && (
              <p className="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700">
                {state.error}
              </p>
            )}

            <SubmitButton disabled={email.trim().length === 0} />
          </form>
        )}

        <p className="mt-6 text-center text-[13px] text-gray-500">
          Remember your password?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-gray-900 hover:underline"
          >
            Sign in
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
        <span>Send reset link</span>
      )}
    </button>
  );
}
