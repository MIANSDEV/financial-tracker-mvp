'use client';

import { useEffect, useState } from 'react';
import { Bell, Moon, Sun, Shield, Save, Smartphone, KeyRound, Eye, EyeOff, Languages } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
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
import { useT } from '@/lib/i18n/use-t';
import { useLanguageStore } from '@/store/language';

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
  const t = useT();
  const { language, setLanguage } = useLanguageStore();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [fcmLoading, setFcmLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

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

  const handlePasswordChange = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (pwForm.next.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser?.email) return;
    setPwSaving(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, pwForm.current);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, pwForm.next);
      toast.success('Password changed successfully');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('Current password is incorrect');
      } else if (code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Try again later');
      } else {
        toast.error('Failed to change password');
      }
    } finally {
      setPwSaving(false);
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.settings.title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t.settings.subtitle}</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.profile}</CardTitle>
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

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-brand-600" />
            {t.settings.changePassword}
          </CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {([
            { key: 'current', label: t.settings.currentPassword },
            { key: 'next',    label: t.settings.newPassword },
            { key: 'confirm', label: t.settings.confirmPassword },
          ] as { key: keyof typeof pwForm; label: string }[]).map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <div className="relative">
                <input
                  type={showPw[key] ? 'text' : 'password'}
                  value={pwForm[key]}
                  onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => ({ ...s, [key]: !s[key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          <div className="pt-1">
            <Button
              onClick={handlePasswordChange}
              loading={pwSaving}
              leftIcon={<KeyRound className="w-4 h-4" />}
            >
              {t.settings.updatePassword}
            </Button>
          </div>
        </div>
      </Card>

      {/* Appearance */}
      {mounted && (
        <Card>
          <CardHeader>
            <CardTitle>{t.settings.appearance}</CardTitle>
          </CardHeader>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t.settings.theme}</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: t.settings.lightMode, icon: <Sun className="w-4 h-4" /> },
                { value: 'dark', label: t.settings.darkMode, icon: <Moon className="w-4 h-4" /> },
                { value: 'system', label: t.settings.systemMode, icon: <Smartphone className="w-4 h-4" /> },
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

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-brand-600" />
            {t.settings.language}
          </CardTitle>
        </CardHeader>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t.settings.languageDesc}</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'en', label: t.settings.english },
            { value: 'bn', label: t.settings.bangla },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLanguage(opt.value)}
              className={cn(
                'py-3 rounded-xl border-2 text-sm font-medium transition-all',
                language === opt.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-4.5 h-4.5 text-brand-600" style={{ width: 18, height: 18 }} />
            {t.settings.pushNotifications}
          </CardTitle>
        </CardHeader>

        <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
          <div className="pb-3">
            <Toggle
              checked={settings.pushEnabled}
              onChange={(v) => setSettings((s) => ({ ...s, pushEnabled: v }))}
              label={t.settings.enablePush}
              description={t.settings.pushDesc}
            />
            {!settings.fcmToken && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnablePush}
                loading={fcmLoading}
                className="mt-2"
              >
                {t.settings.requestPermission}
              </Button>
            )}
          </div>

          {settings.pushEnabled && (
            <div className="pt-2 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-2">
                {t.settings.notificationTypes}
              </p>
              <Toggle
                checked={settings.types.system}
                onChange={(v) => updateType('system', v)}
                label={t.settings.systemNotif}
                description={t.settings.systemNotifDesc}
              />
              <Toggle
                checked={settings.types.financial}
                onChange={(v) => updateType('financial', v)}
                label={t.settings.financialAlerts}
                description={t.settings.financialAlertsDesc}
              />
              <Toggle
                checked={settings.types.activity}
                onChange={(v) => updateType('activity', v)}
                label={t.settings.activityNotif}
                description={t.settings.activityNotifDesc}
              />
              <Toggle
                checked={settings.types.reports}
                onChange={(v) => updateType('reports', v)}
                label={t.settings.reportNotif}
                description={t.settings.reportNotifDesc}
              />
            </div>
          )}
        </div>

        <div className="mt-6">
          <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />}>
            {t.settings.savePreferences}
          </Button>
        </div>
      </Card>
    </div>
  );
}
