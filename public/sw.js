
/**
 * Guardian Tactical Service Worker
 * Handles background notification clicks and basic offline caching.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Focus or open the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});

// Listener for background messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_TACTICAL_ALERT') {
    const { title, body, tag } = event.data.payload;
    self.registration.showNotification(title, {
      body,
      tag,
      icon: 'https://picsum.photos/seed/guardian/192/192',
      badge: 'https://picsum.photos/seed/guardian-badge/96/96',
      vibrate: [200, 100, 200]
    });
  }
});
