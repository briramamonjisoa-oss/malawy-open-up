const CACHE = 'malawy-v49';

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/ui-controls.js',
  '/access-forms.js',
  '/admin-access.js',
  '/navigation-fix.js',
  '/tournaments-ui.js',
  '/push-notifications.js',
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
  if (['/','/index.html','/app.js','/access-forms.js','/admin-access.js','/navigation-fix.js','/access-switch.js','/tournaments-ui.js','/style.css'].includes(path)) {
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


self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'MALAWY OPEN UP', {
    body: data.body || 'Tu as une nouvelle notification.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'malawy-notification',
    renotify: false,
    data: { url: data.url || '/' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if ('focus' in client) {
        await client.navigate(target);
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});
