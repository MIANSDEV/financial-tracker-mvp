'use client';

import { useEffect, useState } from 'react';
import { Plus, Building2, Trash2, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createAuthUser, auth } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import {
  getAllCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  createUser,
  createSubscriptionPayment,
  createNotification,
  createCompanyRole,
  createCategory,
} from '@/lib/firebase/firestore';
import type { Company } from '@/types';
import { SUBSCRIPTION_PLANS, TRANSACTION_CATEGORIES, DEFAULT_ROLE_PERMISSIONS } from '@/types';
import { formatDate, addDays } from '@/lib/utils';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useT } from '@/lib/i18n/use-t';

const schema = z.object({
  name: z.string().min(2, 'Company name is required'),
  email: z.string().email('Valid email required'),
  adminName: z.string().min(2, 'Admin name required'),
  adminEmail: z.string().email('Valid admin email required'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  subscriptionPlan: z.enum(['free', 'basic', 'professional', 'enterprise']),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CompaniesPage() {
  const { user } = useAuthStore();
  const t = useT();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subscriptionPlan: 'basic' },
  });

  useEffect(() => {
    if (user?.role !== 'super_admin') return;
    getAllCompanies()
      .then(setCompanies)
      .finally(() => setLoading(false));
  }, [user?.role]);

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Building2 className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium">{t.common.accessDenied}</p>
        <p className="text-sm mt-1">{t.companies.accessDeniedDesc}</p>
      </div>
    );
  }

  const handleCreate = async (data: FormValues) => {
    setSaving(true);
    try {
      const adminUid = await createAuthUser(data.adminEmail, data.adminPassword);

      const expiresAt = addDays(new Date(), 30);
      const companyId = await createCompany({
        name: data.name,
        email: data.email,
        phone: data.phone,
        subscriptionPlan: data.subscriptionPlan,
        subscriptionExpiresAt: expiresAt,
        status: 'active',
        adminId: adminUid,
      });

      // Seed default categories for the new company
      await Promise.all([
        ...TRANSACTION_CATEGORIES.income.map((name) =>
          createCategory({ companyId, name, type: 'income' })
        ),
        ...TRANSACTION_CATEGORIES.expense.map((name) =>
          createCategory({ companyId, name, type: 'expense' })
        ),
      ]);

      await createCompanyRole({
        companyId,
        name: 'Staff',
        permissions: DEFAULT_ROLE_PERMISSIONS,
      });

      await createUser(adminUid, {
        name: data.adminName,
        email: data.adminEmail,
        role: 'admin',
        companyId,
      });

      const plan = SUBSCRIPTION_PLANS[data.subscriptionPlan];
      if (plan.price > 0) {
        const now = new Date();
        await createSubscriptionPayment({
          companyId,
          companyName: data.name,
          plan: data.subscriptionPlan,
          amount: plan.price,
          status: 'pending',
          dueDate: expiresAt,
          paidAt: null,
          periodStart: now,
          periodEnd: expiresAt,
        });
      }

      if (user?.id) {
        await createNotification({
          userId: user.id,
          title: 'New company created',
          message: `${data.name} has been added on the ${data.subscriptionPlan} plan.`,
          type: 'system',
          read: false,
          timestamp: new Date(),
        });
      }

      toast.success('Company created successfully');
      reset();
      setShowAdminPassword(false);
      setModalOpen(false);
      const updated = await getAllCompanies();
      setCompanies(updated);
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || 'Failed to create company';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (c: Company) => {
    const newStatus = c.status === 'active' ? 'inactive' : 'active';
    await updateCompany(c.id, { status: newStatus });
    setCompanies((prev) =>
      prev.map((co) => (co.id === c.id ? { ...co, status: newStatus } : co))
    );
    if (user?.id) {
      await createNotification({
        userId: user.id,
        title: `Company ${newStatus}`,
        message: `${c.name} has been set to ${newStatus}.`,
        type: 'system',
        read: false,
        timestamp: new Date(),
      });
    }
    toast.success(`Company ${newStatus}`);
  };

  const handleDelete = async (id: string) => {
    try {
      // Delete Firebase Auth accounts for all company users (requires Admin SDK)
      const token = await auth.currentUser?.getIdToken();
      await fetch('/api/companies/delete-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ companyId: id }),
      });
    } catch {
      // Non-fatal — Firestore docs will still be cleaned up below
    }

    await deleteCompany(id);
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    setDeleteConfirm(null);
    toast.success('Company deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.companies.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {companies.length} {t.companies.registeredTenants}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          {t.companies.newCompany}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-6 w-6 text-brand-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : companies.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-12 text-gray-400 dark:text-gray-600">
            <Building2 className="w-12 h-12 mb-3" />
            <p className="font-medium">{t.companies.noCompanies}</p>
            <p className="text-sm mt-1">{t.companies.noCompaniesDesc}</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map((company) => {
            const plan = SUBSCRIPTION_PLANS[company.subscriptionPlan];
            const isExpiringSoon =
              company.subscriptionExpiresAt &&
              new Date(company.subscriptionExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

            return (
              <Card key={company.id}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{company.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{company.email}</p>
                    </div>
                  </div>
                  <Badge variant={company.status === 'active' ? 'success' : 'warning'}>
                    {company.status}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t.companies.plan}</span>
                    <Badge variant="purple">{plan.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t.companies.price}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">৳{plan.price}{t.common.perMonth}</span>
                  </div>
                  {company.subscriptionExpiresAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{t.companies.expires}</span>
                      <span className={cn('font-medium', isExpiringSoon ? 'text-red-500' : 'text-gray-700 dark:text-gray-300')}>
                        {formatDate(company.subscriptionExpiresAt)}
                        {isExpiringSoon && ' ⚠️'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t.companies.created}</span>
                    <span className="text-gray-700 dark:text-gray-300">{formatDate(company.createdAt)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleStatus(company)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      company.status === 'active'
                        ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                    )}
                  >
                    {company.status === 'active' ? t.companies.deactivate : t.companies.activate}
                  </button>
                  {deleteConfirm === company.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(company.id)}
                        className="px-2 py-1.5 rounded-lg text-xs bg-red-500 text-white hover:bg-red-600"
                      >
                        {t.common.delete}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1.5 rounded-lg text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {t.common.cancel}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(company.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.companies.createNewCompany}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleCreate)} className="p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t.companies.companyDetailsSection}</p>
                <div className="space-y-3">
                  {[
                    { name: 'name', label: t.companies.companyName, type: 'text', placeholder: 'Acme Corp' },
                    { name: 'email', label: t.companies.companyEmail, type: 'email', placeholder: 'info@acme.com' },
                    { name: 'phone', label: t.companies.phone, type: 'tel', placeholder: '+880 1234 567890' },
                  ].map(({ name, label, type, placeholder }) => (
                    <div key={name}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                      <input
                        {...register(name as keyof FormValues)}
                        type={type}
                        placeholder={placeholder}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      {errors[name as keyof FormValues] && (
                        <p className="mt-1 text-xs text-red-500">{errors[name as keyof FormValues]?.message}</p>
                      )}
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.companies.subscriptionPlan}</label>
                    <select
                      {...register('subscriptionPlan')}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {Object.entries(SUBSCRIPTION_PLANS).map(([key, val]) => (
                        <option key={key} value={key}>{val.label} — ৳{val.price}{t.common.perMonth}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t.companies.adminAccountSection}</p>
                <div className="space-y-3">
                  {[
                    { name: 'adminName', label: t.companies.adminName, type: 'text', placeholder: 'John Doe' },
                    { name: 'adminEmail', label: t.companies.adminEmail, type: 'email', placeholder: 'admin@acme.com' },
                  ].map(({ name, label, type, placeholder }) => (
                    <div key={name}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                      <input
                        {...register(name as keyof FormValues)}
                        type={type}
                        placeholder={placeholder}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      {errors[name as keyof FormValues] && (
                        <p className="mt-1 text-xs text-red-500">{errors[name as keyof FormValues]?.message}</p>
                      )}
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.companies.adminPassword}</label>
                    <div className="relative">
                      <input
                        {...register('adminPassword')}
                        type={showAdminPassword ? 'text' : 'password'}
                        placeholder={t.companies.minPassword}
                        className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.adminPassword && (
                      <p className="mt-1 text-xs text-red-500">{errors.adminPassword.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
                  {t.common.cancel}
                </Button>
                <Button type="submit" loading={saving} className="flex-1">
                  {t.companies.createCompany}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
