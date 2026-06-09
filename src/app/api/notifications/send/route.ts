import { NextRequest, NextResponse } from 'next/server';

interface SendNotificationBody {
  userId: string;
  title: string;
  message: string;
  type: string;
  companyId?: string;
}

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body: SendNotificationBody = await req.json();
    const { userId, title, message, type, companyId } = body;

    if (!userId || !title || !message || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Lazy load admin SDK only at runtime
    const { getAdminDb, getAdminMessaging } = await import('@/lib/firebase/admin');
    const adminDb = getAdminDb();
    const adminMessagingInstance = getAdminMessaging();

    // Check user notification settings
    const settingsSnap = await adminDb.collection('notification_settings').doc(userId).get();
    const settings = settingsSnap.data();

    if (!settings) {
      return NextResponse.json({ skipped: true, reason: 'no_settings' });
    }

    if (!settings.pushEnabled) {
      return NextResponse.json({ skipped: true, reason: 'push_disabled' });
    }

    if (!settings.types?.[type] && type !== 'system') {
      return NextResponse.json({ skipped: true, reason: `type_${type}_disabled` });
    }

    const fcmToken = settings.fcmToken;
    if (!fcmToken) {
      return NextResponse.json({ skipped: true, reason: 'no_fcm_token' });
    }

    // Frequency limiting: max 3 notifications of same type per day
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const recentSnap = await adminDb
      .collection('notifications')
      .where('userId', '==', userId)
      .where('type', '==', type)
      .where('timestamp', '>=', dayStart)
      .get();

    if (recentSnap.size >= 3 && type !== 'system') {
      return NextResponse.json({ skipped: true, reason: 'rate_limited' });
    }

    // Store notification in Firestore
    await adminDb.collection('notifications').add({
      userId,
      companyId: companyId || null,
      title,
      message,
      type,
      read: false,
      timestamp: new Date(),
    });

    // Send FCM push notification
    await adminMessagingInstance.send({
      token: fcmToken,
      notification: { title, body: message },
      data: { type, userId },
      webpush: {
        notification: {
          title,
          body: message,
          icon: 'https://financial-tracker-mvp.vercel.app/icons/icon-192x192.png',
          badge: 'https://financial-tracker-mvp.vercel.app/icons/badge-72x72.png',
          tag: type,
          renotify: true,
          vibrate: [200, 100, 200],
        },
        fcmOptions: {
          link: 'https://financial-tracker-mvp.vercel.app/notifications',
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
