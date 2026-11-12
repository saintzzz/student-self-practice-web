// CR-141: versioned runtime cache for the practice app shell + media.
// No precache manifest is needed - build assets are content-hashed
// (immutable), so cache-first is safe and the SW stays dependency-free.
// Bump SW_VERSION per deploy convention (release tooling) to rotate
// every cache namespace in one activate pass.
//
// URL predicates live in sw-rules.js (importScripts) so unit tests can
// exercise the exact functions this worker runs.
importScripts('/sw-rules.js');
const { isApiPath, isBuildAsset, isMediaAsset, isAppNav, shellCacheKey } =
  self.SwRules;

const SW_VERSION = 2;
const STATIC = `vieschool-static-v${SW_VERSION}`;
const MEDIA = `vieschool-media-v${SW_VERSION}`;
const APP_SHELL_URL = '/app';
const MEDIA_MAX = 150;
const ORIGIN = self.location.origin;

async function trimMedia(cache) {
  // FIFO-ish bound: cache.keys() returns insertion order.
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - MEDIA_MAX))) {
    await cache.delete(k);
  }
}

// Caching must never change what the page gets: every put below is
// detached (.catch(() => {})) so a rejection - 206 Range responses that
// cache.put refuses, quota exhaustion, transient storage errors - can
// never turn a healthy network response into Response.error().
async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.status === 200) {
    cache.put(request, res.clone()).catch(() => {});
  }
  return res;
}

async function networkFirstShell(request) {
  const url = new URL(request.url);
  const key = new Request(shellCacheKey(url));
  const cache = await caches.open(STATIC);
  try {
    const res = await fetch(request);
    if (res.status === 200) {
      cache.put(key, res.clone()).catch(() => {});
    }
    return res;
  } catch {
    const hit = (await cache.match(key)) ?? (await cache.match(APP_SHELL_URL));
    if (hit) return hit;
    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(MEDIA);
  const hit = await cache.match(request);
  const pending = fetch(request)
    .then((res) => {
      // 200 = full body (never store 206 partials); opaque = no-cors
      // media such as Supabase TTS audio loaded via new Audio() without
      // crossOrigin - cacheable, quota-padded, bounded by MEDIA_MAX.
      if (res.status === 200 || res.type === 'opaque') {
        // Trim unconditionally: chaining it to put success means a full
        // cache (puts rejecting) would wedge and never shrink again.
        cache
          .put(request, res.clone())
          .catch(() => {})
          .finally(() => trimMedia(cache).catch(() => {}));
      }
      return res;
    })
    .catch(() => null);
  return (
    hit ??
    (await pending) ??
    new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  );
}

self.addEventListener('install', (e) => {
  // Best-effort precache: a failed add must not abort install - the
  // shell gets cached on first navigation anyway.
  e.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.add(APP_SHELL_URL))
      .catch(() => {}),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            // Only OUR versioned namespaces - other caches on this
            // origin (unrelated apps sharing the host) are not ours
            // to erase.
            .filter(
              (n) =>
                (n.startsWith('vieschool-static-') ||
                  n.startsWith('vieschool-media-')) &&
                n !== STATIC &&
                n !== MEDIA,
            )
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (isApiPath(url)) return;
  if (request.mode === 'navigate') {
    if (!isAppNav(url)) return;
    e.respondWith(networkFirstShell(request));
    return;
  }
  if (isBuildAsset(url, ORIGIN)) {
    e.respondWith(cacheFirst(request));
    return;
  }
  if (isMediaAsset(url, ORIGIN)) {
    e.respondWith(staleWhileRevalidate(request));
  }
});
