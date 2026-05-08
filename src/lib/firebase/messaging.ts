import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from './config';
import { upsertNotificationSettings } from './firestore';

export async function requestNotificationPermission(userId: string): Promise<string | null> {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    if (token) {
      await upsertNotificationSettings(userId, {
        pushEnabled: true,
        fcmToken: token,
      });
    }

    return token;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
}

export async function setupForegroundMessaging(
  onNotification: (payload: { title: string; body: string; type: string }) => void
) {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    const { notification, data } = payload;
    onNotification({
      title: notification?.title || 'New notification',
      body: notification?.body || '',
      type: (data?.type as string) || 'system',
    });
  });
}
