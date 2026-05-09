'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { markNotificationRead, markAllNotificationsRead } from '@/lib/firebase/firestore';
import { useNotificationStore } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';
import { formatRelativeTime, cn } from '@/lib/utils';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/lib/i18n/use-t';
import toast from 'react-hot-toast';

const typeVariant: Record<string, 'purple' | 'success' | 'info' | 'warning'> = {
  system: 'purple',
  financial: 'success',
  activity: 'info',
  reports: 'warning',
};

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const { notifications } = useNotifications();
  const { markRead, markAllRead } = useNotificationStore();
  const t = useT();

  const handleMarkRead = async (id: string) => {
    markRead(id);
    await markNotificationRead(id);
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    markAllRead();
    await markAllNotificationsRead(user.id);
    toast.success(t.notifications.markAllRead);
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.notifications.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {unread > 0 ? `${unread} ${t.notifications.unread}` : t.notifications.allCaughtUp}
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
            leftIcon={<CheckCheck className="w-4 h-4" />}
          >
            {t.notifications.markAllRead}
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400 dark:text-gray-600">
            <Bell className="w-12 h-12 mb-3" />
            <p className="font-medium">{t.notifications.noNotifications}</p>
            <p className="text-sm mt-1">{t.notifications.noNotificationsDesc}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={cn(
                  'w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                  !n.read && 'bg-brand-50/30 dark:bg-brand-900/5'
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0',
                      n.type === 'system' && 'bg-purple-100 dark:bg-purple-900/30',
                      n.type === 'financial' && 'bg-green-100 dark:bg-green-900/30',
                      n.type === 'activity' && 'bg-blue-100 dark:bg-blue-900/30',
                      n.type === 'reports' && 'bg-orange-100 dark:bg-orange-900/30'
                    )}
                  >
                    {n.type === 'system' && '🔔'}
                    {n.type === 'financial' && '💰'}
                    {n.type === 'activity' && '📝'}
                    {n.type === 'reports' && '📊'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={cn(
                        'font-medium text-sm',
                        !n.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                      )}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                      )}
                      <Badge variant={typeVariant[n.type] || 'default'} className="ml-auto">
                        {t.notifications.typeLabels[n.type as keyof typeof t.notifications.typeLabels] || n.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{n.message}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatRelativeTime(n.timestamp)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
