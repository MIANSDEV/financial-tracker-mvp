'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Search, Trash2, Pencil, ArrowUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TransactionModal } from '@/components/transactions/transaction-modal';
import { PartnerMultiSelect } from '@/components/ui/partner-multi-select';
import { useAuthStore } from '@/store/auth';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createNotification,
  createAuditLog,
  getCompanyCategories,
  getCompanyPartners,
} from '@/lib/firebase/firestore';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/utils';
import { format } from 'date-fns';
import type { Transaction, Category, Partner } from '@/types';
import toast from 'react-hot-toast';
import { usePermissions } from '@/lib/permissions';
import { useT } from '@/lib/i18n/use-t';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'income' | 'expense';

const emptyQuick = () => ({
  type: 'income' as 'income' | 'expense',
  description: '',
  category: '',
  amount: '',
  date: format(new Date(), 'yyyy-MM-dd'),
});

export default function TransactionsPage() {
  const { user, company } = useAuthStore();
  const perms = usePermissions();
  const t = useT();
  const descRef = useRef<HTMLInputElement>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPartner, setFilterPartner] = useState('');
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [quick, setQuick] = useState(emptyQuick);
  const [quickPartnerIds, setQuickPartnerIds] = useState<string[]>([]);
  const [mirrorExpense, setMirrorExpense] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('');

  const fetchTransactions = async () => {
    if (!company?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [txResult, catResult, partnerResult] = await Promise.allSettled([
        getTransactions(company.id),
        getCompanyCategories(company.id),
        getCompanyPartners(company.id),
      ]);
      if (txResult.status === 'fulfilled') setTransactions(txResult.value);
      if (catResult.status === 'fulfilled') setCategories(catResult.value);
      if (partnerResult.status === 'fulfilled') setPartners(partnerResult.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [company?.id]);

  const quickCategories = categories.filter((c) => c.type === quick.type);

  const handleQuickAdd = async () => {
    const amount = parseFloat(quick.amount);
    if (!quick.description.trim() || !quick.category || !amount || amount <= 0) {
      toast.error('Fill in description, category and amount');
      return;
    }
    if (mirrorExpense && !expenseCategory) {
      toast.error('Select an expense category for the mirrored entry');
      return;
    }
    if (!user || !company) return;
    setSaving(true);
    try {
      const selectedPartners = partners.filter((p) => quickPartnerIds.includes(p.id));
      const partnerPayload = selectedPartners.length > 0
        ? { partnerIds: selectedPartners.map((p) => p.id), partnerNames: selectedPartners.map((p) => p.name) }
        : {};
      const base = {
        description: quick.description.trim(),
        amount,
        date: new Date(quick.date),
        companyId: company.id,
        createdBy: user.id,
        createdByName: user.name,
        ...partnerPayload,
      };

      const saves: Promise<string>[] = [
        createTransaction({ ...base, type: quick.type, category: quick.category }),
      ];
      if (mirrorExpense) {
        const mirrorType = quick.type === 'income' ? 'expense' : 'income';
        saves.push(createTransaction({ ...base, type: mirrorType, category: expenseCategory }));
      }

      const ids = await Promise.all(saves);
      await Promise.all([
        createNotification({
          userId: user.id,
          companyId: company.id,
          title: `${quick.type === 'income' ? 'Income' : 'Expense'} added${mirrorExpense ? ' (+mirror)' : ''}`,
          message: `${quick.description.trim()} — ${formatCurrency(amount)}`,
          type: 'activity',
          read: false,
          timestamp: new Date(),
        }),
        ...ids.map((id) => createAuditLog({
          companyId: company.id,
          userId: user.id,
          userName: user.name,
          action: 'CREATE',
          resource: 'transaction',
          resourceId: id,
          details: quick,
        })),
      ]);

      setQuick((prev) => ({ ...emptyQuick(), type: prev.type, date: prev.date }));
      setQuickPartnerIds([]);
      setExpenseCategory('');
      setTimeout(() => descRef.current?.focus(), 0);
      fetchTransactions();
      toast.success(mirrorExpense ? '2 transactions added' : 'Transaction added');
    } catch {
      toast.error('Failed to add transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (data: {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description: string;
    date: string;
    partnerIds: string[];
  }) => {
    if (!user || !company || !editTarget) return;
    setSaving(true);
    const selectedPartners = partners.filter((p) => data.partnerIds.includes(p.id));
    try {
      await updateTransaction(editTarget.id, {
        ...data,
        date: new Date(data.date),
        partnerIds: selectedPartners.map((p) => p.id),
        partnerNames: selectedPartners.map((p) => p.name),
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
      setModalOpen(false);
      setEditTarget(null);
      fetchTransactions();
    } catch {
      toast.error('Failed to update transaction');
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
      filtered.map((tx) => ({
        Date: formatDate(tx.date),
        Type: tx.type,
        Category: tx.category,
        Description: tx.description,
        Amount: tx.amount,
        'Added By': tx.createdByName,
      })),
      'transactions'
    );
  };

  const filtered = transactions.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (filterCategory && tx.category !== filterCategory) return false;
    if (filterPartner && !tx.partnerIds?.includes(filterPartner)) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchesDesc = tx.description.toLowerCase().includes(q);
      const matchesCat = tx.category.toLowerCase().includes(q);
      const matchesPartner = tx.partnerNames?.some((n) => n.toLowerCase().includes(q));
      if (!matchesDesc && !matchesCat && !matchesPartner) return false;
    }
    return true;
  });

  const allCategories = Array.from(new Set(transactions.map((tx) => tx.category)));
  const totalIncome = filtered.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const totalExpense = filtered.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.transactions.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} · Income: {formatCurrency(totalIncome)} · Expense: {formatCurrency(totalExpense)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} leftIcon={<Download className="w-4 h-4" />}>
          {t.transactions.export}
        </Button>
      </div>

      {/* Quick-add form */}
      {perms.canCreateTransactions && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Quick Add
          </p>

          {/* Type toggle */}
          <div className="flex gap-2 mb-3">
            {(['income', 'expense'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setQuick((p) => ({ ...p, type, category: '' }))}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all border-2',
                  quick.type === type
                    ? type === 'income'
                      ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                      : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                )}
              >
                {type === 'income' ? '↑ ' : '↓ '}{type === 'income' ? t.transactions.income : t.transactions.expense}
              </button>
            ))}
          </div>

          {/* Fields row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
            <input
              ref={descRef}
              value={quick.description}
              onChange={(e) => setQuick((p) => ({ ...p, description: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
              placeholder={t.transactions.description}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <select
              value={quick.category}
              onChange={(e) => setQuick((p) => ({ ...p, category: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">{t.transactions.selectCategory}</option>
              {quickCategories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <PartnerMultiSelect
              partners={partners}
              selected={quickPartnerIds}
              onChange={setQuickPartnerIds}
              placeholder={t.transactions.selectPartner}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={quick.amount}
              onChange={(e) => setQuick((p) => ({ ...p, amount: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
              placeholder={t.transactions.amount}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="date"
              value={quick.date}
              onChange={(e) => setQuick((p) => ({ ...p, date: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Mirror toggle */}
          <div className="flex items-center gap-3 my-2">
            <button
              type="button"
              onClick={() => setMirrorExpense((v) => !v)}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                mirrorExpense ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span className={cn(
                'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                mirrorExpense ? 'translate-x-[18px]' : 'translate-x-0.5'
              )} />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Also add as <strong>{quick.type === 'income' ? 'expense' : 'income'}</strong>
            </span>
          </div>

          {/* Mirror category picker */}
          {mirrorExpense && (
            <div className="mb-3">
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 rounded-lg border border-brand-300 dark:border-brand-700 text-sm bg-brand-50 dark:bg-brand-900/20 text-brand-800 dark:text-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">
                  Select {quick.type === 'income' ? 'expense' : 'income'} category…
                </option>
                {categories
                  .filter((c) => c.type !== quick.type)
                  .map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
              </select>
            </div>
          )}

          <Button
            onClick={handleQuickAdd}
            loading={saving}
            leftIcon={<Plus className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            {mirrorExpense ? 'Add Both' : 'Add Transaction'}
          </Button>
        </Card>
      )}

      {/* Filters */}
      <Card>
        {/* Row 1 — Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.transactions.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Row 2 — Type toggle (full width on mobile) */}
        <div className="flex gap-1.5 mb-3">
          {(['all', 'income', 'expense'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors',
                filterType === type
                  ? type === 'income'
                    ? 'bg-green-500 text-white'
                    : type === 'expense'
                    ? 'bg-red-500 text-white'
                    : 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              )}
            >
              {t.transactions[type]}
            </button>
          ))}
        </div>

        {/* Row 3 — Category + Partner selects */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">{t.transactions.allCategories}</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={filterPartner}
            onChange={(e) => setFilterPartner(e.target.value)}
            className="w-full py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Partners</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Active filter pills */}
        {(filterType !== 'all' || filterCategory || filterPartner) && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            {filterType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                {filterType}
                <button onClick={() => setFilterType('all')} className="hover:text-brand-900 dark:hover:text-brand-100">×</button>
              </span>
            )}
            {filterCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {filterCategory}
                <button onClick={() => setFilterCategory('')} className="hover:text-gray-900 dark:hover:text-gray-100">×</button>
              </span>
            )}
            {filterPartner && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                {partners.find((p) => p.id === filterPartner)?.name}
                <button onClick={() => setFilterPartner('')} className="hover:text-purple-900 dark:hover:text-purple-100">×</button>
              </span>
            )}
            <button
              onClick={() => { setFilterType('all'); setFilterCategory(''); setFilterPartner(''); setSearch(''); }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}
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
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.transactions.date}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.transactions.description}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.transactions.category}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.transactions.partner}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.transactions.type}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.transactions.amount}</th>
                    {(perms.canEditTransactions || perms.canDeleteTransactions) && <th className="px-6 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs">{formatDate(tx.date)}</td>
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-gray-900 dark:text-white">{tx.description}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t.transactions.addedBy} {tx.createdByName}</p>
                      </td>
                      <td className="px-6 py-3.5"><Badge variant="default">{tx.category}</Badge></td>
                      <td className="px-6 py-3.5">
                        {tx.partnerNames?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {tx.partnerNames.map((name) => (
                              <span key={name} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{name}</span>
                            ))}
                          </div>
                        ) : <span className="text-gray-300 dark:text-gray-700 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge variant={tx.type === 'income' ? 'success' : 'danger'}>
                          {tx.type === 'income' ? t.transactions.income : t.transactions.expense}
                        </Badge>
                      </td>
                      <td className={cn('px-6 py-3.5 text-right font-semibold whitespace-nowrap', tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      {(perms.canEditTransactions || perms.canDeleteTransactions) && (
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {perms.canEditTransactions && (
                              <button onClick={() => { setEditTarget(tx); setModalOpen(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20">
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {perms.canDeleteTransactions && (
                              deleteConfirm === tx.id ? (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleDelete(tx.id)} className="px-2 py-1 rounded text-xs bg-red-500 text-white">{t.common.confirm}</button>
                                  <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{t.common.cancel}</button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteConfirm(tx.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
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

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((tx) => (
                <div key={tx.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{tx.description}</p>
                      <div className="flex items-center flex-wrap gap-1.5 mt-1">
                        <Badge variant={tx.type === 'income' ? 'success' : 'danger'}>
                          {tx.type === 'income' ? t.transactions.income : t.transactions.expense}
                        </Badge>
                        <Badge variant="default">{tx.category}</Badge>
                        {tx.partnerNames?.map((name) => (
                          <span key={name} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{name}</span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(tx.date)} · {tx.createdByName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={cn('font-bold text-sm', tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                      {(perms.canEditTransactions || perms.canDeleteTransactions) && (
                        <div className="flex gap-1">
                          {perms.canEditTransactions && (
                            <button onClick={() => { setEditTarget(tx); setModalOpen(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {perms.canDeleteTransactions && (
                            deleteConfirm === tx.id ? (
                              <div className="flex gap-1">
                                <button onClick={() => handleDelete(tx.id)} className="px-2 py-1 rounded text-xs bg-red-500 text-white">{t.common.confirm}</button>
                                <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{t.common.cancel}</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(tx.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Edit modal */}
      <TransactionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSave={handleEditSave}
        transaction={editTarget}
        loading={saving}
        categories={categories}
        partners={partners}
      />
    </div>
  );
}
