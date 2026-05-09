'use client';

import { useState } from 'react';
import { Plus, Trash2, Pencil, Shield, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth';
import {
  createCompanyRole,
  updateCompanyRole,
  deleteCompanyRole,
} from '@/lib/firebase/firestore';
import type { CompanyRole, RolePermissions } from '@/types';
import { DEFAULT_ROLE_PERMISSIONS } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-t';

const PERMISSION_KEYS: (keyof RolePermissions)[] = [
  'canViewTransactions', 'canCreateTransactions', 'canEditTransactions', 'canDeleteTransactions',
  'canViewReports', 'canViewAuditLogs', 'canManageUsers',
];

interface RoleFormState {
  name: string;
  permissions: RolePermissions;
}

const defaultForm = (): RoleFormState => ({
  name: '',
  permissions: { ...DEFAULT_ROLE_PERMISSIONS },
});

export default function RolesPage() {
  const { user, company, companyRoles, setCompanyRoles } = useAuthStore();
  const t = useT();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CompanyRole | null>(null);
  const [form, setForm] = useState<RoleFormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Shield className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium">{t.common.accessDenied}</p>
        <p className="text-sm mt-1">{t.roles.accessDeniedDesc}</p>
      </div>
    );
  }

  const openCreate = () => {
    setEditTarget(null);
    setForm(defaultForm());
    setModalOpen(true);
  };

  const openEdit = (role: CompanyRole) => {
    setEditTarget(role);
    setForm({ name: role.name, permissions: { ...role.permissions } });
    setModalOpen(true);
  };

  const togglePermission = (key: keyof RolePermissions) => {
    setForm((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  };

  const handleSave = async () => {
    if (!company || !form.name.trim()) {
      toast.error('Role name is required');
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await updateCompanyRole(editTarget.id, {
          name: form.name.trim(),
          permissions: form.permissions,
        });
        setCompanyRoles(
          companyRoles.map((r) =>
            r.id === editTarget.id
              ? { ...r, name: form.name.trim(), permissions: form.permissions }
              : r
          )
        );
        toast.success('Role updated');
      } else {
        const id = await createCompanyRole({
          companyId: company.id,
          name: form.name.trim(),
          permissions: form.permissions,
        });
        setCompanyRoles([
          ...companyRoles,
          {
            id,
            companyId: company.id,
            name: form.name.trim(),
            permissions: form.permissions,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
        toast.success('Role created');
      }
      setModalOpen(false);
    } catch {
      toast.error('Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roleId: string) => {
    try {
      await deleteCompanyRole(roleId);
      setCompanyRoles(companyRoles.filter((r) => r.id !== roleId));
      setDeleteConfirm(null);
      toast.success('Role deleted');
    } catch {
      toast.error('Failed to delete role');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.roles.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t.roles.subtitle} {company?.name}
          </p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
          {t.roles.newRole}
        </Button>
      </div>

      {companyRoles.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-12 text-gray-400 dark:text-gray-600">
            <Shield className="w-12 h-12 mb-3" />
            <p className="font-medium">{t.roles.noRoles}</p>
            <p className="text-sm mt-1">{t.roles.noRolesDesc}</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companyRoles.map((role) => (
            <Card key={role.id}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                    <Shield className="w-4.5 h-4.5 text-brand-600 dark:text-brand-400" style={{ width: 18, height: 18 }} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(role)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {deleteConfirm === role.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="px-2 py-1 rounded text-xs bg-red-500 text-white"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(role.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                {PERMISSION_KEYS.map((key) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <div
                      className={cn(
                        'w-4 h-4 rounded flex items-center justify-center flex-shrink-0',
                        role.permissions[key]
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      )}
                    >
                      {role.permissions[key] && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span className={cn(role.permissions[key] ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600 line-through')}>
                      {t.roles.permLabels[key]}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editTarget ? t.roles.editRole : t.roles.createRole}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t.roles.roleName}
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={t.roles.roleNamePlaceholder}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t.roles.permissions}</p>
                <div className="space-y-2">
                  {PERMISSION_KEYS.map((key) => (
                    <label
                      key={key}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div
                        onClick={() => togglePermission(key)}
                        className={cn(
                          'mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors cursor-pointer',
                          form.permissions[key]
                            ? 'bg-brand-600 border-brand-600 text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        )}
                      >
                        {form.permissions[key] && <Check className="w-3 h-3" />}
                      </div>
                      <div onClick={() => togglePermission(key)} className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.roles.permLabels[key]}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t.roles.permDescriptions[key]}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
                  {t.common.cancel}
                </Button>
                <Button onClick={handleSave} loading={saving} className="flex-1">
                  {editTarget ? t.common.update : t.common.create}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
