/** @type {import('next').NextConfig} */
// Dev and build MUST never share an output directory: `next build` writes
// production artifacts (pages/_document.js, hashed chunks) and a dev server
// reusing that folder serves stale/missing chunks ("Cannot find module
// './NNN.js'"). Derive the dir from NODE_ENV so the two modes are always
// isolated, regardless of what any .env file sets.
const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  distDir: isDev ? ".next-dev" : ".next",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["@fullcalendar/core", "@fullcalendar/react"],
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable webpack's persistent filesystem cache — the pack-file rename
      // race on Windows corrupts .next and causes 404s for every static asset.
      // NOTE: do NOT override output.filename here — Next.js dev serves
      // chunks from /_next/static/chunks/ and a custom filename breaks the
      // path, producing 404s on every JS asset (app never hydrates).
      // (Ignored under `next dev --turbo`, which has no such cache.)
      config.cache = false;
    }
    return config;
  },
  // NOTE: no headers() block here — the "never cache HTML" rule lives in
  // middleware.ts, where the matcher already excludes _next/static (a
  // headers() source regex was empirically matching static assets too, which
  // would defeat production immutable caching).
};

export default nextConfig;
