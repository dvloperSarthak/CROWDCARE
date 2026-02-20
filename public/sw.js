
/**
 * Guardian Tactical Service Worker
 * Handles background notification clicks and redirects to active SITREPs.
 */
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Extract the tactical redirect URL from notification data
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Focus existing tactical window if available
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        const clientPath = new URL(client.url).pathname;
        if (clientPath === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new tactical window if none exists
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
