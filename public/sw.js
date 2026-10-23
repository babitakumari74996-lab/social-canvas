// Shell cache so a repeat visit paints the splash (and the page) straight from cache,
// instead of waiting for the HTML to come back from the network.
//  - Page navigations: stale-while-revalidate. The cached HTML is returned at once and refreshed in the background.
//  - Hashed build assets (/assets/*) and the splash logo: cache-first. The cached HTML and its assets always
//    come from the same build, so an old cached page never points at deleted files.
const CACHE = "sv-shell-v1";
const ASSET_PATHS = ["/splash-logo.png"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (url.pathname.startsWith("/assets/") || ASSET_PATHS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok && response.type === "basic") cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  if (cached) {
    // Refresh in the background; the cached copy is what the user sees right now.
    network.catch(() => {});
    return cached;
  }
  const fresh = await network;
  return fresh || Response.error();
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") cache.put(request, response.clone());
  return response;
}
