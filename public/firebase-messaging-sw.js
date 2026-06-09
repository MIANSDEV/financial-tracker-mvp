importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCMuuZ14g70LQnGaDR-kI9cxTogNJyUe-g',
  authDomain: 'financial-tracker-ea93e.firebaseapp.com',
  projectId: 'financial-tracker-ea93e',
  storageBucket: 'financial-tracker-ea93e.firebasestorage.app',
  messagingSenderId: '590051039851',
  appId: '1:590051039851:web:a4971a701f5517b6b4af2e',
});

const messaging = firebase.messaging();

const APP_URL = 'https://financial-tracker-mvp.vercel.app';

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const { type } = payload.data || {};

  self.registration.showNotification(title || 'New Notification', {
    body: body || '',
    icon: APP_URL + '/icons/icon-192x192.png',
    badge: APP_URL + '/icons/badge-72x72.png',
    tag: type || 'general',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: APP_URL + '/notifications', ...payload.data },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : APP_URL + '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing open window if available
      for (const client of windowClients) {
        if (client.url.startsWith(APP_URL) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open new window (launches the TWA)
      return clients.openWindow(targetUrl);
    })
  );
});
