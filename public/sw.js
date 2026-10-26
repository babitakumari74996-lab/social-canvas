// Shell cache so a repeat visit paints the splash (and the page) straight from cache,
// instead of waiting for the HTML to come back from the network.
//  - Page navigations: network first, so a new deploy is picked up at once. If the network has not answered
//    within 1s (slow or offline), the cached HTML is shown and the network answer still refreshes the cache.
//  - Hashed build assets (/assets/*) and the splash logo: cache-first. The cached HTML and its assets always
//    come from the same build, so an old cached page never points at deleted files.
const CACHE = "sv-shell-v5";
const ASSET_PATHS = ["/splash-logo.png"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const old = keys.filter((k) => k !== CACHE);
      await Promise.all(old.map((k) => caches.delete(k)));
      await self.clients.claim();
      // Upgrading from an earlier service worker: pages still running the previous build reload once,
      // so the new code is used right away. First-time visitors (no old cache) are not reloaded.
      if (old.length) {
        const pages = await self.clients.matchAll({ type: "window" });
        await Promise.all(pages.map((c) => c.navigate(c.url).catch(() => {})));
      }
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/assets/") || ASSET_PATHS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response.ok && response.type === "basic") cache.put(request, response.clone());
    return response;
  });
  const fallback = new Promise((resolve) => setTimeout(() => resolve(cached || null), 1000));
  const first = await Promise.race([network.catch(() => null), fallback]);
  if (first) return first;
  const fresh = await network.catch(() => null);
  return fresh || cached || Response.error();
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") cache.put(request, response.clone());
  return response;
}
