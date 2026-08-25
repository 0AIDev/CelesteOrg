"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@phosphor-icons/react";

/**
 * Landing target for Supabase magic links (invites, recovery, …).
 *
 * The session arrives in the URL *hash* (#access_token=…), which the server
 * never sees. This client page hands the hash to the browser Supabase client,
 * which persists the session into cookies, then reloads the intended route so
 * the server-side page can see the authenticated session.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Completing sign-in…");

  useEffect(() => {
    let cancelled = false;
    const sb = createClient();

    (async () => {
      // getSession() triggers supabase-js's URL-hash detection; with the
      // @supabase/ssr browser client the tokens land in cookies as a side
      // effect, so a plain reload makes them visible to the server.
      const {
        data: { session },
      } = await sb.auth.getSession();

      if (cancelled) return;

      if (session) {
        const next = searchParams.get("next") ?? "/dashboard";
        window.location.replace(next);
      } else {
        setStatus("No session found");
        const next = searchParams.get("next");
        const q = next ? `?next=${encodeURIComponent(next)}` : "";
        window.setTimeout(() => {
          window.location.replace(`/sign-in${q}`);
        }, 1200);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Loading status={status} />;
}

function Loading({ status = "Completing sign-in…" }: { status?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white">
      <Spinner className="h-5 w-5 animate-spin text-gray-400" />
      <p className="text-sm text-gray-500">{status}</p>
    </div>
  );
}
