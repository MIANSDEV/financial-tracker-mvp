'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Download, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { getTransactions } from '@/lib/firebase/firestore';
import { formatCurrency, exportToCSV, formatDate } from '@/lib/utils';
import type { Transaction } from '@/types';
import {
  subMonths,
  startOfMonth,
  endOfMonth,
  format,
  eachMonthOfInterval,
} from 'date-fns';
import { useT } from '@/lib/i18n/use-t';

export default function ReportsPage() {
  const { company } = useAuthStore();
  const t = useT();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<3 | 6 | 12>(6);

  useEffect(() => {
    if (!company?.id) { setLoading(false); return; }
    getTransactions(company.id)
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, [company?.id]);

  const now = new Date();
  const monthRange = eachMonthOfInterval({ start: subMonths(now, period - 1), end: now });

  const monthlyData = monthRange.map((month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const monthTxns = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d >= start && d <= end;
    });
    const income = monthTxns.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    const expense = monthTxns.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
    return { month: format(month, 'MMM yy'), income, expense, profit: income - expense };
  });

  const categoryData = Array.from(
    transactions
      .filter((tx) => tx.type === 'expense')
      .reduce((map, tx) => {
        map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
        return map;
      }, new Map<string, number>())
  )
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const totalIncome = transactions.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const totalExpense = transactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);

  const periodLabels: Record<number, string> = {
    3: t.reports.months3,
    6: t.reports.months6,
    12: t.reports.months12,
  };

  const handleExport = (type: 'income' | 'expense') => {
    exportToCSV(
      transactions.filter((tx) => tx.type === type).map((tx) => ({
        Date: formatDate(tx.date),
        Category: tx.category,
        Description: tx.description,
        Amount: tx.amount,
        Partners: tx.partnerNames?.join(', ') || '',
      })),
      `${type}-report-${format(now, 'yyyy-MM-dd')}`
    );
  };

  const yFmt = (v: number) => `৳${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`;

  if (!company?.id) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <BarChart3 className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium text-gray-600 dark:text-gray-300">{t.reports.noCompany}</p>
        <p className="text-sm mt-1">{t.reports.noCompanyDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header — stacks on mobile */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.reports.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t.reports.subtitle} {company?.name}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {([3, 6, 12] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === p
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={() => handleExport('income')}>
            Income
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={() => handleExport('expense')}>
            Expense
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: t.reports.totalIncome, value: totalIncome, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/10' },
          { label: t.reports.totalExpenses, value: totalExpense, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/10' },
          { label: t.reports.netProfit, value: totalIncome - totalExpense, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/10' },
        ].map((item) => (
          <div key={item.label} className={`${item.bg} rounded-xl border border-gray-200 dark:border-gray-800 p-4`}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
            <p className={`text-2xl font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Monthly Bar Chart */}
      <Card padding={false}>
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <CardTitle>{t.reports.monthlyComparison}</CardTitle>
        </div>
        <div className="p-2 sm:p-4">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={yFmt} width={48} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name={t.reports.income} fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name={t.reports.expenses} fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Profit Line Chart */}
      <Card padding={false}>
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <CardTitle>{t.reports.profitTrend}</CardTitle>
        </div>
        <div className="p-2 sm:p-4">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={yFmt} width={48} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="profit" name={t.reports.profit} stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Category Breakdown */}
      <Card padding={false}>
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <CardTitle>{t.reports.expenseByCategory}</CardTitle>
        </div>
        {loading || categoryData.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-400">
            <BarChart3 className="w-8 h-8 mb-2" />
            <p className="text-sm">{t.reports.noExpenseAvailable}</p>
          </div>
        ) : (
          <>
            {/* Chart — hidden on very small screens, visible on sm+ */}
            <div className="hidden sm:block p-4">
              <ResponsiveContainer width="100%" height={Math.max(180, categoryData.length * 36)}>
                <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={yFmt} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="amount" name={t.reports.amount} fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Mobile list — always shown on xs, hidden on sm+ */}
            <div className="sm:hidden divide-y divide-gray-50 dark:divide-gray-800">
              {categoryData.map((item, i) => {
                const max = categoryData[0]?.amount || 1;
                const pct = Math.round((item.amount / max) * 100);
                return (
                  <div key={item.category} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.category}</span>
                      </div>
                      <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
