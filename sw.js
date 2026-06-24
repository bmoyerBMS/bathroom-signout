// sw.js — Service Worker for Bathroom Sign-Out PWA
const CACHE_NAME = 'bso-v1';

// Files to cache for offline use
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json'
];

// ── Install: cache all shell files ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_FILES))
  );
  self.skipWaiting();
});

// ── Activate: clear old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: serve from cache, fall back to network ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always pass API calls (Apps Script) straight to network — never cache them
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // For app shell files: cache-first strategy
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache new valid responses
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
