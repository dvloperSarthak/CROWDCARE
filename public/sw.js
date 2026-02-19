
/**
 * Guardian Tactical Service Worker
 * Handles background notifications and critical alert delivery.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Listener for system notifications triggered from the foreground when tab is backgrounded
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_TACTICAL_ALERT') {
    const { title, body, tag } = event.data.payload;
    
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: 'https://picsum.photos/seed/guardian/192/192',
        tag: tag || 'tactical-alert',
        vibrate: [200, 100, 200, 100, 200],
        badge: 'https://picsum.photos/seed/guardian-badge/96/96',
        data: {
          url: '/'
        }
      })
    );
  }
});

// Handle notification interaction
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
