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

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const { type } = payload.data || {};

  self.registration.showNotification(title || 'New Notification', {
    body: body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: type || 'general',
    renotify: true,
    data: payload.data,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow('/notifications')
    );
  }
});
