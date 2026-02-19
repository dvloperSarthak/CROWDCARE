
/* public/sw.js */
// Guardian Tactical Service Worker for Background Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

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

self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon.png', // Optional icon
      vibrate: [200, 100, 200],
      tag: data.tag || 'guardian-alert',
      data: { url: '/' }
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});
