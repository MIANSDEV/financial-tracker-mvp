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

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  role: z.enum(['admin', 'staff']),
});

type FormValues = z.infer<typeof schema>;

const roleVariant: Record<string, 'purple' | 'info' | 'default'> = {
  super_admin: 'purple',
  admin: 'info',
  staff: 'default',
};

export default function UsersPage() {
  const { user, company } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const canManage = user?.role === 'super_admin' || user?.role === 'admin';

  // All hooks must be called before any early return
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
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm mt-1">You don&apos;t have permission to manage users.</p>
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {users.length} user{users.length !== 1 ? 's' : ''} in {company?.name}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Add User
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Joined</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 dark:text-gray-600">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={roleVariant[u.role] || 'default'}>
                          {u.role.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        {u.id !== user?.id && (
                          <div className="flex justify-end">
                            {deleteConfirm === u.id ? (
                              <div className="flex gap-1">
                                <button onClick={() => handleDelete(u.id)} className="px-2 py-1 rounded text-xs bg-red-500 text-white">Confirm</button>
                                <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add New User</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(handleCreate)} className="p-6 space-y-4">
              {[
                { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Jane Smith' },
                { name: 'email', label: 'Email', type: 'email', placeholder: 'jane@company.com' },
                { name: 'password', label: 'Password', type: 'password', placeholder: 'Min 8 characters' },
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select {...register('role')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" loading={saving} className="flex-1">Create User</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
