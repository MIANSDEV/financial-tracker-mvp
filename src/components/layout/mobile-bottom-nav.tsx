'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowUpDown,
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useNotificationStore } from '@/store/notifications';
import { usePermissions } from '@/lib/permissions';
import { useT } from '@/lib/i18n/use-t';
import type { RolePermissions } from '@/types';

interface TabItem {
  labelKey: 'dashboard' | 'transactions' | 'reports' | 'companies' | 'subscriptions' | 'notifications';
  href: string;
  icon: React.ElementType;
  roles: string[];
  permissionKey?: keyof RolePermissions;
}

const TAB_ITEMS: TabItem[] = [
  { labelKey: 'dashboard',     href: '/dashboard',     icon: LayoutDashboard, roles: ['super_admin', 'admin', 'staff'] },
  { labelKey: 'transactions',  href: '/transactions',  icon: ArrowUpDown,     roles: ['admin', 'staff'], permissionKey: 'canViewTransactions' },
  { labelKey: 'reports',       href: '/reports',       icon: BarChart3,       roles: ['admin', 'staff'], permissionKey: 'canViewReports' },
  { labelKey: 'companies',     href: '/companies',     icon: Building2,       roles: ['super_admin'] },
  { labelKey: 'subscriptions', href: '/subscriptions', icon: CreditCard,      roles: ['super_admin'] },
  { labelKey: 'notifications', href: '/notifications', icon: Bell,            roles: ['super_admin', 'admin', 'staff'] },
];

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const perms = usePermissions();
  const t = useT();

  const filtered = TAB_ITEMS.filter((item) => {
    if (!user?.role) return false;
    if (user.role === 'super_admin' || user.role === 'admin') {
      return item.roles.includes(user.role);
    }
    if (!item.roles.includes('staff')) return false;
    if (item.permissionKey) return perms[item.permissionKey];
    return true;
  }).slice(0, 4);

  const tabs = [...filtered, null]; // null = "More" slot

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map((item, i) => {
        if (!item) {
          return (
            <button
              key="more"
              onClick={onMoreClick}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-1 text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
            >
              <MoreHorizontal className="w-6 h-6" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          );
        }

        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const isNotif = item.href === '/notifications';

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-colors active:bg-gray-100 dark:active:bg-gray-800',
              isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            <div className="relative">
              <item.icon className="w-6 h-6" />
              {isNotif && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium truncate max-w-full px-1">
              {t.nav[item.labelKey]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
