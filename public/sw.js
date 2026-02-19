
/**
 * CrowdCare Guardian Tactical Service Worker
 * Handles background notifications and tactical alerts.
 */

self.addEventListener('install', (event) => {
  console.log('Guardian SW installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Guardian SW activated');
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_TACTICAL_ALERT') {
    const { title, body, tag } = event.data.payload;
    
    self.registration.showNotification(title, {
      body,
      icon: 'https://picsum.photos/seed/guardian/192/192',
      badge: 'https://picsum.photos/seed/guardian/96/96',
      tag,
      renotify: true,
      vibrate: [200, 100, 200],
      data: {
        url: self.location.origin
      }
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
