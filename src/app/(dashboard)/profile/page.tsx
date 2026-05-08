'use client';

import { useEffect, useState } from 'react';
import { Save, User, Building2, Mail, Phone, MapPin, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { updateUser, updateCompany } from '@/lib/firebase/firestore';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, company, setUser, setCompany } = useAuthStore();

  // Personal info form
  const [name, setName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Company info form
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Manage your personal and company information
        </p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4 text-brand-600" />
            Personal Information
          </CardTitle>
        </CardHeader>

        {/* Avatar */}
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
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Your full name"
              />
            </div>
          </div>

          {/* Email — read only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
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
            <p className="mt-1 text-xs text-gray-400">Email cannot be changed here. Contact support if needed.</p>
          </div>

          <Button
            onClick={handleSaveProfile}
            loading={savingProfile}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Profile
          </Button>
        </div>
      </Card>

      {/* Company Information — admin only */}
      {user?.role === 'admin' && company && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-600" />
              Company Information
            </CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Your company name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company Email
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
                Phone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  rows={2}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="123 Main St, City, Country"
                />
              </div>
            </div>

            {/* Subscription info — read only */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Subscription Plan</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize mt-0.5">
                  {company.subscriptionPlan}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Expires</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                  {company.subscriptionExpiresAt
                    ? new Date(company.subscriptionExpiresAt).toLocaleDateString()
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
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
              Save Company Info
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
