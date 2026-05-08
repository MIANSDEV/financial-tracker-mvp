'use client';

import { useEffect, useState } from 'react';
import { Bell, Moon, Sun, Shield, Save, Smartphone } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth';
import {
  getNotificationSettings,
  upsertNotificationSettings,
} from '@/lib/firebase/firestore';
import { requestNotificationPermission } from '@/lib/firebase/messaging';
import type { NotificationSettings } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
          checked ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

const defaultSettings: NotificationSettings = {
  userId: '',
  pushEnabled: true,
  emailEnabled: false,
  types: {
    system: true,
    financial: true,
    activity: true,
    reports: false,
  },
  updatedAt: new Date(),
};

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [fcmLoading, setFcmLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!user?.id) return;
    getNotificationSettings(user.id).then((s) => {
      if (s) setSettings(s);
    });
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await upsertNotificationSettings(user.id, settings);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleEnablePush = async () => {
    if (!user?.id) return;
    setFcmLoading(true);
    try {
      const token = await requestNotificationPermission(user.id);
      if (token) {
        setSettings((s) => ({ ...s, pushEnabled: true }));
        toast.success('Push notifications enabled!');
      } else {
        toast.error('Permission denied or not supported');
      }
    } finally {
      setFcmLoading(false);
    }
  };

  const updateType = (type: keyof NotificationSettings['types'], value: boolean) => {
    setSettings((s) => ({
      ...s,
      types: { ...s.types, [type]: value },
    }));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your account and notification preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center text-white text-xl font-bold">
            {user?.name?.slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{user?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Shield className="w-3.5 h-3.5 text-brand-600" />
              <span className="text-xs font-medium text-brand-600 capitalize">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Appearance */}
      {mounted && (
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Theme</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
                { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
                { value: 'system', label: 'System', icon: <Smartphone className="w-4 h-4" /> },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                    theme === opt.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-4.5 h-4.5 text-brand-600" style={{ width: 18, height: 18 }} />
            Push Notifications
          </CardTitle>
        </CardHeader>

        <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
          <div className="pb-3">
            <Toggle
              checked={settings.pushEnabled}
              onChange={(v) => setSettings((s) => ({ ...s, pushEnabled: v }))}
              label="Enable Push Notifications"
              description="Receive browser push notifications"
            />
            {!settings.fcmToken && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnablePush}
                loading={fcmLoading}
                className="mt-2"
              >
                Request Permission
              </Button>
            )}
          </div>

          {settings.pushEnabled && (
            <div className="pt-2 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-2">
                Notification Types
              </p>
              <Toggle
                checked={settings.types.system}
                onChange={(v) => updateType('system', v)}
                label="System Notifications"
                description="Subscription expiry, payment due (critical)"
              />
              <Toggle
                checked={settings.types.financial}
                onChange={(v) => updateType('financial', v)}
                label="Financial Alerts"
                description="High expense alerts, daily summaries"
              />
              <Toggle
                checked={settings.types.activity}
                onChange={(v) => updateType('activity', v)}
                label="Activity Notifications"
                description="Transaction added, edited by team members"
              />
              <Toggle
                checked={settings.types.reports}
                onChange={(v) => updateType('reports', v)}
                label="Report Notifications"
                description="Weekly and monthly report summaries"
              />
            </div>
          )}
        </div>

        <div className="mt-6">
          <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />}>
            Save Preferences
          </Button>
        </div>
      </Card>
    </div>
  );
}
