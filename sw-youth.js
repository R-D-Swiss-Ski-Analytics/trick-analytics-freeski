// Service Worker der Youth-App: zeigt Push-Nachrichten an und öffnet beim Antippen die App.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = {body: e.data && e.data.text()}; }
  e.waitUntil(self.registration.showNotification(d.title || 'Trick Analyses Youth', {
    body: d.body || '',
    icon: 'icons/icon-youth-192.png',
    badge: 'icons/icon-youth-192.png',
    tag: d.tag || undefined,
    data: {url: d.url || './'},
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    for (const c of all){ if (c.url.startsWith(self.registration.scope)){ await c.focus(); return; } }
    await self.clients.openWindow(url);
  })());
});
