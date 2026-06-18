/*
 * Domora service worker — dependency-free.
 *
 * Goals (the "installable + basic offline" tier):
 *  - Satisfy Chrome's installability criteria (registered SW with a fetch handler).
 *  - Precache a small app shell + a branded offline fallback page.
 *  - Serve the offline page when a navigation fails (no network).
 *  - Stay-out-of-the-way for everything else: network-first for navigations so
 *    authenticated, always-fresh pages are never served stale; never touch API
 *    calls or auth.
 */

const VERSION = "domora-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const PRECACHE_URLS = [
  "/offline.html",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Allow the page to trigger an immediate activation after an update.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isApiOrAuth(url) {
  return url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin pass through
  if (isApiOrAuth(url)) return; // never cache API/auth — always live

  // Navigations: network-first, fall back to the offline page when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline.html", { ignoreSearch: true }).then(
          (cached) => cached || new Response("Offline", { status: 503, statusText: "Offline" }),
        ),
      ),
    );
    return;
  }

  // Static assets (icons, manifest, _next static): cache-first with background fill.
  if (
    url.pathname.startsWith("/_next/static/") ||
    PRECACHE_URLS.includes(url.pathname) ||
    /\.(?:png|svg|webmanifest|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
