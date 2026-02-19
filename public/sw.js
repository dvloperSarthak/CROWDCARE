/**
 * CrowdCare Guardian Service Worker
 * Handles background notifications and persistent tactical alerts.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Bring the app to the foreground when a notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Listener for background messages (simulated push or app-triggered)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_TACTICAL_ALERT') {
    const { title, body, tag } = event.data.payload;
    
    self.registration.showNotification(title, {
      body,
      tag,
      icon: 'https://picsum.photos/seed/guardian/192/192',
      badge: 'https://picsum.photos/seed/badge/96/96',
      vibrate: [200, 100, 200],
      renotify: true,
      requireInteraction: true,
    });
  }
});