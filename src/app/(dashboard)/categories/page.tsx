'use client';

import { useState } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { updateCompany } from '@/lib/firebase/firestore';
import { TRANSACTION_CATEGORIES } from '@/types';
import toast from 'react-hot-toast';
import { useT } from '@/lib/i18n/use-t';

export default function CategoriesPage() {
  const { user, company, setCompany } = useAuthStore();
  const t = useT();
  const [newCategory, setNewCategory] = useState('');
  const [newType, setNewType] = useState<'income' | 'expense'>('income');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'income' | 'expense'; name: string } | null>(null);

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Tag className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium">{t.common.accessDenied}</p>
        <p className="text-sm mt-1">{t.categories.accessDeniedDesc}</p>
      </div>
    );
  }

  const incomeCategories = company?.incomeCategories?.length
    ? company.incomeCategories
    : [...TRANSACTION_CATEGORIES.income];
  const expenseCategories = company?.expenseCategories?.length
    ? company.expenseCategories
    : [...TRANSACTION_CATEGORIES.expense];

  const handleAdd = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed || !company) return;

    const existing = newType === 'income' ? incomeCategories : expenseCategories;
    if (existing.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Category already exists');
      return;
    }

    setSaving(true);
    try {
      const updated =
        newType === 'income'
          ? { incomeCategories: [...incomeCategories, trimmed] }
          : { expenseCategories: [...expenseCategories, trimmed] };

      await updateCompany(company.id, updated);
      setCompany({ ...company, ...updated });
      setNewCategory('');
      toast.success('Category added');
    } catch {
      toast.error('Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: 'income' | 'expense', name: string) => {
    if (!company) return;
    try {
      const updated =
        type === 'income'
          ? { incomeCategories: incomeCategories.filter((c) => c !== name) }
          : { expenseCategories: expenseCategories.filter((c) => c !== name) };

      await updateCompany(company.id, updated);
      setCompany({ ...company, ...updated });
      setDeleteConfirm(null);
      toast.success('Category removed');
    } catch {
      toast.error('Failed to remove category');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.categories.title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {t.categories.subtitle} {company?.name}
        </p>
      </div>

      {/* Add category */}
      <Card>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t.categories.addCategory}</p>
        <div className="flex gap-2">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as 'income' | 'expense')}
            className="px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="income">{t.transactions.income}</option>
            <option value="expense">{t.transactions.expense}</option>
          </select>
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={t.categories.categoryPlaceholder}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button onClick={handleAdd} loading={saving} leftIcon={<Plus className="w-4 h-4" />}>
            {t.common.add}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income categories */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {t.categories.incomeCategories}
              <span className="ml-2 text-sm font-normal text-gray-400">({incomeCategories.length})</span>
            </h2>
          </div>
          <div className="space-y-2">
            {incomeCategories.map((cat) => (
              <div
                key={cat}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <Badge variant="success">{cat}</Badge>
                {deleteConfirm?.type === 'income' && deleteConfirm.name === cat ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete('income', cat)}
                      className="px-2 py-0.5 rounded text-xs bg-red-500 text-white"
                    >
                      {t.common.delete}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                      {t.common.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm({ type: 'income', name: cat })}
                    className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {incomeCategories.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-4">{t.categories.noIncomeCategories}</p>
            )}
          </div>
        </Card>

        {/* Expense categories */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {t.categories.expenseCategories}
              <span className="ml-2 text-sm font-normal text-gray-400">({expenseCategories.length})</span>
            </h2>
          </div>
          <div className="space-y-2">
            {expenseCategories.map((cat) => (
              <div
                key={cat}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <Badge variant="danger">{cat}</Badge>
                {deleteConfirm?.type === 'expense' && deleteConfirm.name === cat ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete('expense', cat)}
                      className="px-2 py-0.5 rounded text-xs bg-red-500 text-white"
                    >
                      {t.common.delete}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                      {t.common.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm({ type: 'expense', name: cat })}
                    className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {expenseCategories.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-4">{t.categories.noExpenseCategories}</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
