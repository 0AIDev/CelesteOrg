import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { acceptInvite } from "@/app/actions/invite-actions";

export const metadata = { title: "Join Celeste" };

export default async function InviteCompletePage({
  searchParams,
}: {
  searchParams?: { invite?: string };
}) {
  const token = searchParams?.invite ?? "";

  // Ensure the caller is authenticated before touching the invite.
  const user = await getUser().catch(() => null);
  if (!user) {
    const encoded = new URLSearchParams({ next: `/invite/complete?invite=${token}` }).toString();
    redirect(`/sign-in?${encoded}`);
  }

  const result = await acceptInvite({ token });

  // Show a minimal, self-contained confirmation page (no shell) so the user
  // sees exactly what happened, then let them continue into the app.
  const path = result.ok
    ? "/onboarding?welcome=1"
    : `/teams?invite_error=${encodeURIComponent(result.error)}`;

  redirect(path);
}