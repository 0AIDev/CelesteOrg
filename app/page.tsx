import { redirect } from "next/navigation";

// Root redirects to sign-in. Onboarding is only accessible via invite link.
export default function Home() {
  redirect("/sign-in");
}
