const CACHE = 'malawy-v137';

const ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/style.css',
  '/flow-messenger.css',
  '/flow-messenger.js',
  '/app.js',
  '/messages-ui.js',
  '/calls-ui.js',
  '/ui-controls.js',
  '/access-forms.js',
  '/admin-access.js',
  '/admin-dashboard.js',
  '/navigation-fix.js',
  '/back-navigation.js',
  '/tournaments-ui.js',
  '/battle-royale-scoring.js',
  '/connection-refresh.js',
  '/update-gate.js',
  '/push-notifications.js',
  '/community-feed.js?v=interactions-overlay-v6',
  '/stories-presence-ui.js?v=11',
  '/navbar-v2.js?v=meniscus-5',
  '/manifest.webmanifest',
  '/icon.svg',
  '/assets/freefire-ranks-hd.webp'
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
  if(event.request.mode==='navigate'){
    const refresh=fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('/index.html',copy));}
      return response;
    }).catch(()=>null);
    event.respondWith((async()=>{
      const cached=await caches.match('/index.html')||await caches.match(event.request);
      if(cached){event.waitUntil(refresh.then(()=>undefined));return cached;}
      const fresh=await refresh;
      if(fresh)return fresh;
      const offline=await caches.match('/offline.html');
      return offline||Response.error();
    })());
    return;
  }
  if (['/','/index.html','/app.js','/access-forms.js','/admin-access.js','/navigation-fix.js','/back-navigation.js','/access-switch.js','/tournaments-ui.js','/connection-refresh.js','/style.css','/update-gate.js','/app-version.json','/community-feed.js','/stories-presence-ui.js','/navbar-v2.js','/messages-ui.js','/friends-ui.js','/profile-hub.js','/calls-ui.js','/flow-messenger.js'].includes(path)) {
    const cachedResponse=caches.match(event.request,{ignoreSearch:true});
    const networkResponse=fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
      return response;
    }).catch(()=>null);
    event.respondWith((async()=>{
      const cached=await cachedResponse;
      if(cached){event.waitUntil(networkResponse.then(()=>undefined));return cached;}
      return await networkResponse||Response.error();
    })());
    return;
  }

  event.respondWith(
    caches.match(event.request,{ignoreSearch:true}).then(response =>
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
    icon: '/icon-192.png', badge: '/icon-192.png', tag: data.tag || 'malawy-notification',
    renotify: false, data: { url: data.url || '/' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) { if ('focus' in client) { await client.navigate(target); return client.focus(); } }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});
