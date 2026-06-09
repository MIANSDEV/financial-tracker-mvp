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

    const { getAdminDb, getAdminMessaging } = await import('@/lib/firebase/admin');
    const adminDb = getAdminDb();

    // Always write to Firestore so the in-app bell works regardless of push settings
    await adminDb.collection('notifications').add({
      userId,
      companyId: companyId || null,
      title,
      message,
      type,
      read: false,
      timestamp: new Date(),
    });

    // Now check whether to send FCM push
    const settingsSnap = await adminDb.collection('notification_settings').doc(userId).get();
    const settings = settingsSnap.data();

    // Treat missing pushEnabled as true (old documents didn't have this field)
    if (settings.pushEnabled === false) {
      return NextResponse.json({ success: true, push: false, reason: 'push_disabled' });
    }

    // If types map is missing (old document), default all types to enabled
    const typeAllowed = settings.types ? settings.types[type] !== false : true;
    if (!typeAllowed && type !== 'system') {
      return NextResponse.json({ success: true, push: false, reason: `type_${type}_disabled` });
    }

    const fcmToken = settings.fcmToken as string | undefined;
    if (!fcmToken) {
      return NextResponse.json({ success: true, push: false, reason: 'no_fcm_token' });
    }

    // Rate limit: max 3 non-system pushes per user per day
    if (type !== 'system') {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const recentSnap = await adminDb
        .collection('notifications')
        .where('userId', '==', userId)
        .where('type', '==', type)
        .where('timestamp', '>=', dayStart)
        .get();
      if (recentSnap.size > 3) {
        return NextResponse.json({ success: true, push: false, reason: 'rate_limited' });
      }
    }

    // Send FCM push
    const adminMessagingInstance = getAdminMessaging();
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

    return NextResponse.json({ success: true, push: true });
  } catch (error) {
    console.error('Notification send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
