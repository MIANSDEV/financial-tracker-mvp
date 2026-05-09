'use client';

import { useEffect, useState } from 'react';
import { Save, User, Building2, Mail, Phone, MapPin, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { updateUser, updateCompany } from '@/lib/firebase/firestore';
import toast from 'react-hot-toast';
import { useT } from '@/lib/i18n/use-t';

export default function ProfilePage() {
  const { user, company, setUser, setCompany } = useAuthStore();
  const t = useT();

  const [name, setName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  useEffect(() => {
    if (company) {
      setCompanyName(company.name);
      setCompanyEmail(company.email);
      setCompanyPhone(company.phone ?? '');
      setCompanyAddress(company.address ?? '');
    }
  }, [company]);

  const handleSaveProfile = async () => {
    if (!user || !name.trim()) return;
    if (name.trim() === user.name) { toast('No changes to save'); return; }
    setSavingProfile(true);
    try {
      await updateUser(user.id, { name: name.trim() });
      setUser({ ...user, name: name.trim() });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!company || !companyName.trim()) return;
    setSavingCompany(true);
    try {
      const updates = {
        name: companyName.trim(),
        email: companyEmail.trim(),
        phone: companyPhone.trim() || undefined,
        address: companyAddress.trim() || undefined,
      };
      await updateCompany(company.id, updates);
      setCompany({ ...company, ...updates });
      toast.success('Company info updated');
    } catch {
      toast.error('Failed to update company info');
    } finally {
      setSavingCompany(false);
    }
  };

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    staff: 'Staff',
  };

  const roleVariant: Record<string, 'purple' | 'info' | 'default'> = {
    super_admin: 'purple',
    admin: 'info',
    staff: 'default',
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.profile.title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t.profile.subtitle}</p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4 text-brand-600" />
            {t.profile.personalInfo}
          </CardTitle>
        </CardHeader>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {name?.slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{user?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            <div className="mt-1">
              {user?.role && (
                <Badge variant={roleVariant[user.role] || 'default'}>
                  <Shield className="w-3 h-3 mr-1 inline" />
                  {roleLabel[user.role] || user.role}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.profile.name}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder={t.profile.namePlaceholder}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.profile.email}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={user?.email ?? ''}
                readOnly
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">{t.profile.emailNote}</p>
          </div>

          <Button
            onClick={handleSaveProfile}
            loading={savingProfile}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {t.profile.saveProfile}
          </Button>
        </div>
      </Card>

      {/* Company Information — admin only */}
      {user?.role === 'admin' && company && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-600" />
              {t.profile.companyInfo}
            </CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.profile.companyName}
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder={t.profile.companyNamePlaceholder}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.profile.companyEmail}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="company@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.profile.phone} <span className="text-gray-400 font-normal">{t.profile.optional}</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="+880 1234 567890"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.profile.address} <span className="text-gray-400 font-normal">{t.profile.optional}</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  rows={2}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="123 Main St, Dhaka, Bangladesh"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.profile.plan}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize mt-0.5">
                  {company.subscriptionPlan}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.profile.expiresAt}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                  {company.subscriptionExpiresAt
                    ? new Date(company.subscriptionExpiresAt).toLocaleDateString()
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.profile.status}</p>
                <Badge
                  variant={company.status === 'active' ? 'success' : 'warning'}
                  className="mt-0.5"
                >
                  {company.status}
                </Badge>
              </div>
            </div>

            <Button
              onClick={handleSaveCompany}
              loading={savingCompany}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {t.profile.saveCompanyInfo}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
