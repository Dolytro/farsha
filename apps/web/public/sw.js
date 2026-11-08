/* Farsha service worker: lets the editor open without a network once it has been loaded.
 * - pages: network first, the last good copy when offline (deep links fall back to the editor shell)
 * - /app/assets/* (hashed file names): cache first
 * - the starter file and the fonts: stale while revalidate
 * Google Drive and every other API call is left alone. */
const VERSION = "farsha-v1";
const SHELL = "/app/";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      cache.put(SHELL, response.clone());
    }
    return response;
  } catch (err) {
    return (await cache.match(request, { ignoreSearch: true })) || (await cache.match(SHELL)) || Promise.reject(err);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return hit || (await refresh) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/app/")) return;
  if (request.mode === "navigate") event.respondWith(networkFirst(request));
  else if (url.pathname.startsWith("/app/assets/")) event.respondWith(cacheFirst(request));
  else if (url.pathname !== "/app/sw.js") event.respondWith(staleWhileRevalidate(request));
});
