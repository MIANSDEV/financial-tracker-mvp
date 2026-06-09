'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Tag, Pencil, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import {
  getCompanyCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/firebase/firestore';
import type { Category } from '@/types';
import toast from 'react-hot-toast';
import { useT } from '@/lib/i18n/use-t';

type EditTarget = { id: string; name: string };

function CategoryColumn({
  type,
  categories,
  onAdd,
  onRename,
  onDelete,
}: {
  type: 'income' | 'expense';
  categories: Category[];
  onAdd: (type: 'income' | 'expense', name: string) => Promise<void>;
  onRename: (id: string, oldName: string, newName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const t = useT();
  const [addValue, setAddValue] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const isIncome = type === 'income';
  const color = isIncome ? 'bg-green-500' : 'bg-red-500';

  const handleAdd = async () => {
    const trimmed = addValue.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Category already exists');
      return;
    }
    setAddSaving(true);
    try {
      await onAdd(type, trimmed);
      setAddValue('');
      addInputRef.current?.focus();
    } finally {
      setAddSaving(false);
    }
  };

  const startEdit = (cat: Category) => {
    setDeleteConfirm(null);
    setEditTarget({ id: cat.id, name: cat.name });
    setEditValue(cat.name);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleRename = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || !editTarget) return;
    if (trimmed === editTarget.name) { setEditTarget(null); return; }
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editTarget.id)) {
      toast.error('Category already exists');
      return;
    }
    await onRename(editTarget.id, editTarget.name, trimmed);
    setEditTarget(null);
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <h2 className="font-semibold text-gray-900 dark:text-white">
          {isIncome ? t.categories.incomeCategories : t.categories.expenseCategories}
          <span className="ml-2 text-sm font-normal text-gray-400">({categories.length})</span>
        </h2>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => {
          const isEditing = editTarget?.id === cat.id;
          const isDeleting = deleteConfirm === cat.id;

          if (isEditing) {
            return (
              <div key={cat.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <input
                  ref={editInputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') setEditTarget(null);
                  }}
                  className="flex-1 px-2 py-0.5 rounded border border-brand-400 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button onClick={handleRename} className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditTarget(null)} className="p-1 rounded text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }

          return (
            <div key={cat.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <Badge variant={isIncome ? 'success' : 'danger'}>{cat.name}</Badge>
              {isDeleting ? (
                <div className="flex gap-1">
                  <button onClick={() => onDelete(cat.id).then(() => setDeleteConfirm(null))} className="px-2 py-0.5 rounded text-xs bg-red-500 text-white">
                    {t.common.delete}
                  </button>
                  <button onClick={() => setDeleteConfirm(null)} className="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {t.common.cancel}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-0.5">
                  <button onClick={() => startEdit(cat)} className="p-1 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setEditTarget(null); setDeleteConfirm(cat.id); }} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {categories.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-3">
            {isIncome ? t.categories.noIncomeCategories : t.categories.noExpenseCategories}
          </p>
        )}
      </div>

      {/* Inline add */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
        <input
          ref={addInputRef}
          value={addValue}
          onChange={(e) => setAddValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={t.categories.categoryPlaceholder}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={handleAdd}
          disabled={addSaving || !addValue.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.common.add}
        </button>
      </div>
    </Card>
  );
}

export default function CategoriesPage() {
  const { user, company } = useAuthStore();
  const t = useT();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    getCompanyCategories(company.id)
      .then(setCategories)
      .catch(() => {/* index may still be building */})
      .finally(() => setLoading(false));
  }, [company?.id]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Tag className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium">{t.common.accessDenied}</p>
        <p className="text-sm mt-1">{t.categories.accessDeniedDesc}</p>
      </div>
    );
  }

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const handleAdd = async (type: 'income' | 'expense', name: string) => {
    if (!company) return;
    const id = await createCategory({ companyId: company.id, name, type });
    setCategories((prev) => [
      ...prev,
      { id, companyId: company.id, name, type, createdAt: new Date() },
    ]);
    toast.success('Category added');
  };

  const handleRename = async (id: string, _oldName: string, newName: string) => {
    await updateCategory(id, newName);
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: newName } : c)));
    toast.success('Category renamed');
  };

  const handleDelete = async (id: string) => {
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast.success('Category removed');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.categories.title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {t.categories.subtitle} {company?.name}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-6 w-6 text-brand-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CategoryColumn
            type="income"
            categories={incomeCategories}
            onAdd={handleAdd}
            onRename={handleRename}
            onDelete={handleDelete}
          />
          <CategoryColumn
            type="expense"
            categories={expenseCategories}
            onAdd={handleAdd}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        </div>
      )}
    </div>
  );
}
