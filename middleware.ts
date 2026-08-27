import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type SetCookie = { name: string; value: string; options: CookieOptions };

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If the Supabase project isn't wired up yet (no .env.local), don't 500 on
  // every request — let the static shell render so you can still see the UI.
  // Authenticated pages will surface their own clear error below.
  if (!supabaseUrl || !supabaseAnonKey) {
    return withFreshHtml(request);
  }

  let response = NextResponse.next({ request });

  const { pathname } = request.nextUrl;
  const protectedPaths = [
    "/dashboard",
    "/org-chart",
    "/teams",
    "/documents",
    "/calendar",
    "/ideas",
    "/reports",
    "/settings",
    "/developers",
    "/ai-usage",
    "/approvals",
    "/equity",
    "/dashboards",
  ];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  // Fast path: no session cookie at all → skip the Supabase auth round-trip.
  // This makes unauthenticated navigation (invite links, sign-in, onboarding)
  // near-instant and avoids cold-start 504s.
  const hasSessionCookie = request.cookies.getAll().some((c) =>
    c.name.startsWith("sb-") && c.name.endsWith("-auth-token"),
  );

  // Protected route with no session → redirect to sign-in (no Supabase call).
  if (isProtected && !hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Onboarding gating without a session. An invite link (?token=) is allowed
  // without being logged in; anything else redirects to sign-in.
  if (pathname.startsWith("/onboarding")) {
    const hasInviteToken = request.nextUrl.searchParams.has("token");
    if (!hasSessionCookie && !hasInviteToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }
    // Invite flow with no session → serve the page, zero Supabase calls.
    if (!hasSessionCookie && hasInviteToken) {
      return withFreshHtml(request);
    }
  }

  // No session cookie on any other (public) route → nothing to refresh.
  if (!hasSessionCookie) {
    return withFreshHtml(request, response);
  }

  // Session cookie exists → refresh the Supabase auth session.
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: SetCookie[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Stale/expired cookie on a protected route → sign-in.
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Already-authenticated users don't need the login page.
  if (user && pathname === "/sign-in") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Authenticated user on onboarding → allow.
  if (pathname.startsWith("/onboarding")) {
    return withFreshHtml(request, response);
  }

  return withFreshHtml(request, response);
}

// HTML documents must never be cached: every navigation fetches fresh HTML
// referencing the current chunk hashes, so a stale page can never reference
// chunks that no longer exist (the old "?v=" 404 loop). Hashed static assets
// are excluded by the middleware matcher below, so they keep Next's default
// immutable caching in production.
function withFreshHtml(request: NextRequest, response?: NextResponse) {
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    const res = response ?? NextResponse.next({ request });
    res.headers.set("Cache-Control", "no-store, must-revalidate");
    return res;
  }
  return response ?? NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
