import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { acceptInvite } from "@/app/actions/invite-actions";
import Link from "next/link";

export const metadata = { title: "Join Celeste HQ" };

export default async function InvitePage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  const token = searchParams?.token ?? "";

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-900">Invalid Invite</h1>
          <p className="mt-2 text-sm text-gray-500">
            This invite link is invalid or has expired.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Look up the invite to get role info
  const sb = await createClient();
  const { data: invite } = await sb
    .from("invites")
    .select("email, role_title, status, departments(name)")
    .eq("token", token)
    .maybeSingle();

  if (!invite || invite.status !== "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-900">Invite Not Found</h1>
          <p className="mt-2 text-sm text-gray-500">
            This invite has already been used or is no longer valid.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const departmentName =
    (invite.departments as unknown as { name?: string } | null)?.name ?? null;

  // If user is already logged in, redirect directly to onboarding
  const user = await getUser().catch(() => null);
  if (user) {
    // Accept the invite server-side, then go to onboarding
    const result = await acceptInvite({ token });
    if (result.ok) {
      redirect("/onboarding?welcome=1");
    }
    // If invite already accepted, just go to dashboard
    redirect("/dashboard");
  }

  // Not logged in — show the invite landing page
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" x2="19" y1="8" y2="14" />
            <line x1="22" x2="16" y1="11" y2="11" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-gray-900">
          Join Celeste HQ
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          You&apos;ve been invited to join the workspace
          {invite.role_title && (
            <>
              {" "}as{" "}
              <span className="font-medium text-gray-700">{invite.role_title}</span>
            </>
          )}
          {departmentName && (
            <>
              {" "}in{" "}
              <span className="font-medium text-gray-700">{departmentName}</span>
            </>
          )}
          .
        </p>

        {/* Email hint */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[13px] text-gray-500">Invited as</p>
          <p className="text-sm font-medium text-gray-900">{invite.email}</p>
        </div>

        {/* CTA */}
        <Link
          href={`/sign-in?next=${encodeURIComponent(`/invite/complete?invite=${token}`)}`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          Sign in to Accept
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M5 12l5-5-5-5" />
          </svg>
        </Link>

        <p className="mt-8 text-[12px] text-gray-400">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-medium text-gray-600 hover:text-gray-900">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
