'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, GitBranch, Pencil, Check, X, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth';
import { getCompanyBranches, createBranch, updateBranch, deleteBranch, getTransactions } from '@/lib/firebase/firestore';
import type { Branch, Transaction } from '@/types';
import toast from 'react-hot-toast';
import { useT } from '@/lib/i18n/use-t';
import { formatCurrency, cn } from '@/lib/utils';

export default function BranchesPage() {
  const { user, company } = useAuthStore();
  const t = useT();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const editRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!company?.id) return;
    Promise.allSettled([
      getCompanyBranches(company.id),
      getTransactions(company.id),
    ]).then(([branchesResult, txResult]) => {
      if (branchesResult.status === 'fulfilled') setBranches(branchesResult.value);
      if (txResult.status === 'fulfilled') setTransactions(txResult.value);
    }).finally(() => setLoading(false));
  }, [company?.id]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <GitBranch className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium">{t.common.accessDenied}</p>
        <p className="text-sm mt-1">{t.branches.accessDeniedDesc}</p>
      </div>
    );
  }

  const handleAdd = async () => {
    const name = newName.trim();
    const address = newAddress.trim();
    if (!name || !company) return;
    if (branches.some((b) => b.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Branch already exists');
      return;
    }
    setAddSaving(true);
    try {
      const data = { companyId: company.id, name, ...(address ? { address } : {}) };
      const id = await createBranch(data);
      setBranches((prev) => [...prev, { ...data, id, createdAt: new Date() }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setNewAddress('');
      addRef.current?.focus();
      toast.success('Branch added');
    } catch {
      toast.error('Failed to add branch');
    } finally {
      setAddSaving(false);
    }
  };

  const handleUpdate = async () => {
    const name = editName.trim();
    const address = editAddress.trim();
    if (!name || !editTarget) return;
    if (branches.some((b) => b.name.toLowerCase() === name.toLowerCase() && b.id !== editTarget.id)) {
      toast.error('Branch already exists');
      return;
    }
    try {
      await updateBranch(editTarget.id, { name, address });
      setBranches((prev) => prev.map((b) => (b.id === editTarget.id ? { ...b, name, address } : b)));
      setEditTarget(null);
      toast.success('Branch updated');
    } catch {
      toast.error('Failed to update branch');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBranch(id);
      setBranches((prev) => prev.filter((b) => b.id !== id));
      setDeleteConfirm(null);
      toast.success('Branch removed');
    } catch {
      toast.error('Failed to remove branch');
    }
  };

  const startEdit = (b: Branch) => {
    setDeleteConfirm(null);
    setEditTarget(b);
    setEditName(b.name);
    setEditAddress(b.address ?? '');
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const getBranchTotals = (branchId: string) => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.branchId !== branchId) continue;
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense, net: income - expense };
  };

  const inputCls = 'px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.branches.title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {t.branches.subtitle} {company?.name}
        </p>
      </div>

      {/* Add branch */}
      <Card>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t.branches.addBranch}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={addRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={t.branches.branchName}
            className={cn('flex-1', inputCls)}
          />
          <input
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={t.branches.branchAddress}
            className={cn('flex-1', inputCls)}
          />
          <button
            onClick={handleAdd}
            disabled={addSaving || !newName.trim()}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.common.add}
          </button>
        </div>
      </Card>

      {/* Branches list */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-4 h-4 text-brand-600" />
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {t.branches.title}
            <span className="ml-2 text-sm font-normal text-gray-400">({branches.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <GitBranch className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">{t.branches.noBranches}</p>
            <p className="text-xs mt-1">{t.branches.noBranchesDesc}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {branches.map((b) => {
              const isEditing = editTarget?.id === b.id;
              const isDeleting = deleteConfirm === b.id;
              const totals = getBranchTotals(b.id);

              return (
                <div key={b.id} className="py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 group">
                  {isEditing ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <input
                        ref={editRef}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate();
                          if (e.key === 'Escape') setEditTarget(null);
                        }}
                        placeholder={t.branches.branchName}
                        className="flex-1 px-2 py-1 rounded border border-brand-400 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <input
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate();
                          if (e.key === 'Escape') setEditTarget(null);
                        }}
                        placeholder={t.branches.branchAddress}
                        className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <div className="flex gap-1">
                        <button onClick={handleUpdate} className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditTarget(null)} className="p-1 rounded text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{b.name}</p>
                          {b.address && (
                            <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {b.address}
                            </p>
                          )}
                        </div>
                        {isDeleting ? (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => handleDelete(b.id)} className="px-2 py-1 rounded text-xs bg-red-500 text-white">
                              {t.common.delete}
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {t.common.cancel}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(b)} className="p-1.5 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setEditTarget(null); setDeleteConfirm(b.id); }} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        <div>
                          <p className="text-gray-400">{t.branches.income}</p>
                          <p className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(totals.income)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">{t.branches.expense}</p>
                          <p className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(totals.expense)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">{t.branches.net}</p>
                          <p className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(totals.net)}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
