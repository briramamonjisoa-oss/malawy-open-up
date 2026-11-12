
const CACHE = 'malawy-v2';

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
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

  event.respondWith(
    caches.match(event.request).then(response =>
      response ||
      fetch(event.request).catch(() => caches.match('/'))
    )
  );
});
