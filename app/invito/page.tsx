import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { acceptInvite } from "@/app/actions/invite-actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/ui/Logo";
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
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F0F0F]">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Invalid Invite</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This invite link is invalid or has expired.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Look up the invite using admin client (public page, no auth session yet)
  const admin = createAdminClient();
  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("email, role_title, status, department_id, departments(name)")
    .eq("token", token)
    .maybeSingle();

  if (inviteError) {
    console.error("Invite lookup error:", inviteError);
  }

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F0F0F]">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Invite Not Found</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This invite link is invalid. Please request a new invite.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (invite.status !== "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F0F0F]">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Invite Already Used</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This invite has already been accepted. Please sign in with your account.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200"
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
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F0F0F] px-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mx-auto mb-6">
          <Logo className="h-12 w-auto" />
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Join Celeste HQ
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          You&apos;ve been invited to join the workspace
          {invite.role_title && (
            <>
              {" "}as{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{invite.role_title}</span>
            </>
          )}
          {departmentName && (
            <>
              {" "}in{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{departmentName}</span>
            </>
          )}
          .
        </p>

        {/* Email hint */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.03)]">
          <p className="text-[13px] text-gray-500 dark:text-gray-400">Invited as</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{invite.email}</p>
        </div>

        {/* CTA */}
        <Link
          href={`/sign-in?next=${encodeURIComponent(`/invite/complete?invite=${token}`)}`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          Complete the Onboarding
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M5 12l5-5-5-5" />
          </svg>
        </Link>


      </div>
    </div>
  );
}
