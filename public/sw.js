
// Guardian Tactical Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle background notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_TACTICAL_ALERT') {
    const { title, body, tag } = event.data.payload;
    self.registration.showNotification(title, {
      body,
      icon: 'https://picsum.photos/seed/guardian/192/192',
      tag,
      badge: 'https://picsum.photos/seed/guardian/96/96',
    });
  }
});
