'use client';

import { useEffect } from 'react';
import { subscribeToNotifications } from '@/lib/firebase/firestore';
import { useNotificationStore } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';

export function useNotifications() {
  const { user, company } = useAuthStore();
  const { notifications, unreadCount, setNotifications, markRead, markAllRead } =
    useNotificationStore();

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToNotifications(
      user.id,
      company?.id || '',
      setNotifications
    );

    return unsubscribe;
  }, [user?.id, company?.id]);

  return { notifications, unreadCount, markRead, markAllRead };
}
