const CACHE = 'malawy-v23';

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/admin-access.js',
  '/navigation-fix.js',
  '/access-switch.js',
  '/tournaments-ui.js',
  '/manifest.webmanifest',
  '/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (
    event.request.method !== 'GET' ||
    new URL(event.request.url).pathname.includes('/.netlify/functions/')
  ) {
    return;
  }

  const path = new URL(event.request.url).pathname;
  if (['/','/index.html','/app.js','/admin-access.js','/navigation-fix.js','/access-switch.js','/tournaments-ui.js','/style.css'].includes(path)) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response =>
      response ||
      fetch(event.request).catch(() => caches.match('/'))
    )
  );
});
