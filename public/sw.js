const CACHE_NAME = "celeste-hq-v1";
const PRECACHE_URLS = [
  "/dashboard",
  "/sign-in",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Skip non-GET and API calls — only cache navigations and static assets.
  if (request.method !== "GET") return;
  if (request.url.includes("/api/")) return;
  if (request.url.includes("/rest/v1/")) return;

  event.respondWith(
    (async () => {
      // Network-first for HTML navigations, cache-first for static assets.
      if (request.mode === "navigate") {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
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
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        return new Response("", { status: 504 });
      }
    })(),
  );
});
