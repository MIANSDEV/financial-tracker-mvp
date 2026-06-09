'use client';

import { useEffect, useState } from 'react';
import { Plus, Users, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createAuthUser } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { getCompanyUsers, createUser, deleteUser } from '@/lib/firebase/firestore';
import { formatDate } from '@/lib/utils';
import type { User } from '@/types';
import toast from 'react-hot-toast';
import { useT } from '@/lib/i18n/use-t';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  role: z.string().min(1, 'Role is required'),
});

type FormValues = z.infer<typeof schema>;

const roleVariant: Record<string, 'purple' | 'info' | 'default'> = {
  super_admin: 'purple',
  admin: 'info',
  staff: 'default',
};

export default function UsersPage() {
  const { user, company, companyRoles } = useAuthStore();
  const t = useT();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const canManage = user?.role === 'super_admin' || user?.role === 'admin';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'staff' },
  });

  const fetchUsers = async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await getCompanyUsers(company.id);
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [company?.id]);

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Users className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium">{t.common.accessDenied}</p>
        <p className="text-sm mt-1">{t.users.accessDeniedDesc}</p>
      </div>
    );
  }

  const handleCreate = async (data: FormValues) => {
    if (!company) return;
    setSaving(true);
    try {
      const uid = await createAuthUser(data.email, data.password);
      await createUser(uid, {
        name: data.name,
        email: data.email,
        role: data.role,
        companyId: company.id,
      });
      toast.success('User created');
      reset();
      setModalOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/email-already-in-use') {
        toast.error('Email already in use');
      } else {
        toast.error('Failed to create user');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeleteConfirm(null);
      toast.success('User removed');
    } catch {
      toast.error('Failed to remove user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.users.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {users.length} {t.users.usersIn} {company?.name}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          {t.users.addUser}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-6 w-6 text-brand-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <Card padding={false}>
          {users.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400 dark:text-gray-600 text-sm">{t.users.noUsers}</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t.users.user}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t.users.role}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t.users.joined}</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">{u.name.slice(0, 2).toUpperCase()}</div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4"><Badge variant={roleVariant[u.role] || 'default'}>{u.role.replace('_', ' ')}</Badge></td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">{formatDate(u.createdAt)}</td>
                        <td className="px-6 py-4">
                          {u.id !== user?.id && (
                            <div className="flex justify-end">
                              {deleteConfirm === u.id ? (
                                <div className="flex gap-1">
                                  <button onClick={() => handleDelete(u.id)} className="px-2 py-1 rounded text-xs bg-red-500 text-white">{t.common.confirm}</button>
                                  <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{t.common.cancel}</button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteConfirm(u.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((u) => (
                  <div key={u.id} className="px-4 py-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{u.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{u.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={roleVariant[u.role] || 'default'}>{u.role.replace('_', ' ')}</Badge>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(u.createdAt)}</span>
                      </div>
                    </div>
                    {u.id !== user?.id && (
                      <div className="shrink-0">
                        {deleteConfirm === u.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleDelete(u.id)} className="px-2 py-1 rounded text-xs bg-red-500 text-white">{t.common.confirm}</button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{t.common.cancel}</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(u.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Add User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.users.newUser}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(handleCreate)} className="p-6 space-y-4">
              {[
                { name: 'name', label: t.users.fullName, type: 'text', placeholder: t.users.fullNamePlaceholder },
                { name: 'email', label: t.users.email, type: 'email', placeholder: t.users.emailPlaceholder },
                { name: 'password', label: t.users.password, type: 'password', placeholder: t.users.passwordPlaceholder },
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.users.role}</label>
                <select {...register('role')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="admin">Admin</option>
                  {companyRoles.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                  {companyRoles.length === 0 && <option value="staff">Staff</option>}
                </select>
                {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role.message}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">{t.common.cancel}</Button>
                <Button type="submit" loading={saving} className="flex-1">{t.users.createUser}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
