/* Service worker for the Python Foundations Reference PWA.
 *
 * Strategy: precache the whole app on install (it is a small, fully static
 * site), serve cache-first, and refresh the cache in the background
 * (stale-while-revalidate). Students therefore get instant offline access;
 * content updates arrive on the next visit while online.
 *
 * IMPORTANT: bump CACHE_VERSION whenever any precached file changes
 * (especially after regenerating js/data.js). The version change makes
 * browsers reinstall the cache.
 */

const CACHE_VERSION = "pfr-v2.0.1";

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/data.js",
  "./js/app.js",
  "./js/search.js",
  "./js/glossary.js",
  "./js/tasks.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET requests.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Stale-while-revalidate: answer from cache immediately, update in background.
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
