const CACHE_NAME = "celeste-hq-v3";
const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/sign-in",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use Promise.allSettled to not fail if some URLs can't be cached
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`Failed to cache ${url}:`, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Skip non-GET and API calls — only cache navigations and static assets.
  if (request.method !== "GET") return;
  // Browser extensions and other non-http schemes are outside this PWA's cache.
  if (!/^https?:$/.test(new URL(request.url).protocol)) return;
  if (request.url.includes("/api/")) return;
  if (request.url.includes("/rest/v1/")) return;

  event.respondWith(
    (async () => {
      // Network-first for HTML navigations, cache-first for static assets.
      if (request.mode === "navigate") {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          if (response.ok) {
            await cache.put(request, response.clone()).catch(() => {});
          }
          return response;
        } catch {
          const cached = await caches.match(request);
          return cached || new Response("Offline", { status: 503 });
        }
      }

      // Static assets: cache-first.
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          if (response.ok) {
            await cache.put(request, response.clone()).catch(() => {});
          }
        }
        return response;
      } catch {
        return new Response("", { status: 504 });
      }
    })()
  );
});
