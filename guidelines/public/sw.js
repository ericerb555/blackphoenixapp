// Black Phoenix Service Worker — handles web push notifications

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(clients.claim()); });

self.addEventListener('push', e => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'Black Phoenix', body: e.data.text() }; }
  const title = data.title || 'Black Phoenix Company';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/BPB_phoenix_full_color_logo.png',
    badge: '/BPB_phoenix_full_color_logo.png',
    tag: data.tag || 'bp-notification',
    data: { url: data.url || '/' },
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
    actions: data.actions || [],
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
