
/*
 * GUARDIAN SERVICE WORKER
 * Handles background tactical notifications and push events.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { 
    title: 'Guardian Tactical Alert', 
    body: 'New mission intelligence received.' 
  };
  
  const options = {
    body: data.body,
    icon: 'https://picsum.photos/seed/guardian/192/192',
    badge: 'https://picsum.photos/seed/badge/96/96',
    tag: data.tag || 'tactical-alert',
    renotify: true,
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
