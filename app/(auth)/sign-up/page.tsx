"use client";

import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-[360px]">
        <h1 className="text-center text-[24px] font-bold tracking-tight text-gray-900">
          Create your account
        </h1>
        <p className="mt-1.5 text-center text-[13px] text-gray-500">
          Welcome to CelesteHQ
        </p>

        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center">
          <p className="text-sm font-medium text-gray-900">CelesteHQ is invite-only</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
            New teammates join through an invite from a founder or admin. If you
            received an invite link, open it to create your account — no signup
            form needed.
          </p>
          <Link
            href="/sign-in"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-gray-900 px-6 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
