import { redirect } from "next/navigation";

// The session check lives in middleware.ts (which runs first on every
// request) — no need to hit Supabase again here. This page is a pure,
// dependency-free redirect so the root stays fast even on cold start.
export default function Home() {
  redirect("/onboarding");
}
