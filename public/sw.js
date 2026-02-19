
/**
 * Guardian Tactical Service Worker
 * Handles background notification clicks and basic offline support.
 */

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // When a notification is clicked, open the app or focus the existing tab
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});

// Listener for push events (for future cloud messaging integration)
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'Guardian Alert', body: 'New tactical update received.' };
  
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    tag: data.tag || 'tactical-alert',
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
