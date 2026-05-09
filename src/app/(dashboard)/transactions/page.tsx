'use client';

import { useEffect, useState } from 'react';
import { Plus, Filter, Download, Search, Trash2, Pencil, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TransactionModal } from '@/components/transactions/transaction-modal';
import { useAuthStore } from '@/store/auth';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createNotification,
  createAuditLog,
} from '@/lib/firebase/firestore';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/utils';
import type { Transaction } from '@/types';
import toast from 'react-hot-toast';
import { usePermissions } from '@/lib/permissions';
import { useT } from '@/lib/i18n/use-t';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'income' | 'expense';

export default function TransactionsPage() {
  const { user, company } = useAuthStore();
  const perms = usePermissions();
  const t = useT();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchTransactions = async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getTransactions(company.id);
      setTransactions(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [company?.id]);

  const filtered = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.description.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const allCategories = Array.from(new Set(transactions.map((t) => t.category)));

  const handleSave = async (data: {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description: string;
    date: string;
  }) => {
    if (!user || !company) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateTransaction(editTarget.id, {
          ...data,
          date: new Date(data.date),
        });
        await createAuditLog({
          companyId: company.id,
          userId: user.id,
          userName: user.name,
          action: 'UPDATE',
          resource: 'transaction',
          resourceId: editTarget.id,
          details: data,
        });
        toast.success('Transaction updated');
      } else {
        const txnId = await createTransaction({
          ...data,
          date: new Date(data.date),
          companyId: company.id,
          createdBy: user.id,
          createdByName: user.name,
        });
        await createNotification({
          userId: user.id,
          companyId: company.id,
          title: `${data.type === 'income' ? 'Income' : 'Expense'} added`,
          message: `${data.description} — ${formatCurrency(data.amount)}`,
          type: 'activity',
          read: false,
          timestamp: new Date(),
        });
        await createAuditLog({
          companyId: company.id,
          userId: user.id,
          userName: user.name,
          action: 'CREATE',
          resource: 'transaction',
          resourceId: txnId,
          details: data,
        });
        toast.success('Transaction added');
      }
      setModalOpen(false);
      setEditTarget(null);
      fetchTransactions();
    } catch {
      toast.error('Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !company) return;
    try {
      await deleteTransaction(id);
      await createAuditLog({
        companyId: company.id,
        userId: user.id,
        userName: user.name,
        action: 'DELETE',
        resource: 'transaction',
        resourceId: id,
        details: {},
      });
      toast.success('Transaction deleted');
      setDeleteConfirm(null);
      fetchTransactions();
    } catch {
      toast.error('Failed to delete transaction');
    }
  };

  const handleExport = () => {
    exportToCSV(
      filtered.map((t) => ({
        Date: formatDate(t.date),
        Type: t.type,
        Category: t.category,
        Description: t.description,
        Amount: t.amount,
        'Added By': t.createdByName,
      })),
      'transactions'
    );
  };

  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  if (!company?.id) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <ArrowUpDown className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium text-gray-600 dark:text-gray-300">{t.transactions.noCompany}</p>
        <p className="text-sm mt-1 text-center max-w-xs">{t.transactions.noCompanyDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.transactions.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} · Income: {formatCurrency(totalIncome)} · Expense: {formatCurrency(totalExpense)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} leftIcon={<Download className="w-4 h-4" />}>
            {t.transactions.export}
          </Button>
          {perms.canCreateTransactions && (
            <Button size="sm" onClick={() => { setEditTarget(null); setModalOpen(true); }} leftIcon={<Plus className="w-4 h-4" />}>
              {t.transactions.add}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.transactions.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex gap-1">
              {(['all', 'income', 'expense'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                    filterType === type
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                  )}
                >
                  {t.transactions[type]}
                </button>
              ))}
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">{t.transactions.allCategories}</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-6 w-6 text-brand-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400 dark:text-gray-600">
            <ArrowUpDown className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">{t.transactions.noTransactions}</p>
            <p className="text-xs mt-1">{t.transactions.adjustFilters}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.transactions.date}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.transactions.description}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.transactions.category}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.transactions.type}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.transactions.amount}</th>
                  {(perms.canEditTransactions || perms.canDeleteTransactions) && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-gray-900 dark:text-white">{tx.description}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t.transactions.addedBy} {tx.createdByName}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant="default">{tx.category}</Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={tx.type === 'income' ? 'success' : 'danger'}>
                        {tx.type === 'income' ? t.transactions.income : t.transactions.expense}
                      </Badge>
                    </td>
                    <td className={cn(
                      'px-6 py-3.5 text-right font-semibold whitespace-nowrap',
                      tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    {(perms.canEditTransactions || perms.canDeleteTransactions) && (
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {perms.canEditTransactions && (
                            <button
                              onClick={() => { setEditTarget(tx); setModalOpen(true); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {perms.canDeleteTransactions && (
                            deleteConfirm === tx.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(tx.id)}
                                  className="px-2 py-1 rounded text-xs bg-red-500 text-white hover:bg-red-600"
                                >
                                  {t.common.confirm}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-1 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                >
                                  {t.common.cancel}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(tx.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <TransactionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSave={handleSave}
        transaction={editTarget}
        loading={saving}
        incomeCategories={company?.incomeCategories}
        expenseCategories={company?.expenseCategories}
      />
    </div>
  );
}
