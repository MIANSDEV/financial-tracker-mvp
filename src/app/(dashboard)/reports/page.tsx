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
import { TRANSACTION_CATEGORIES } from '@/types';
import {
  subMonths,
  startOfMonth,
  endOfMonth,
  format,
  eachMonthOfInterval,
} from 'date-fns';

export default function ReportsPage() {
  const { user, company } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<3 | 6 | 12>(6);

  useEffect(() => {
    if (!company?.id) return;
    getTransactions(company.id)
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, [company?.id]);

  const now = new Date();
  const monthRange = eachMonthOfInterval({
    start: subMonths(now, period - 1),
    end: now,
  });

  const monthlyData = monthRange.map((month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const monthTxns = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
    const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { month: format(month, 'MMM yy'), income, expense, profit: income - expense };
  });

  const categoryData = TRANSACTION_CATEGORIES.expense.map((cat) => {
    const total = transactions
      .filter((t) => t.type === 'expense' && t.category === cat)
      .reduce((s, t) => s + t.amount, 0);
    return { category: cat, amount: total };
  }).filter((d) => d.amount > 0).sort((a, b) => b.amount - a.amount);

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const handleExport = () => {
    exportToCSV(
      transactions.map((t) => ({
        Date: formatDate(t.date),
        Type: t.type,
        Category: t.category,
        Description: t.description,
        Amount: t.amount,
      })),
      `financial-report-${format(now, 'yyyy-MM-dd')}`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Financial analytics for {company?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
                {p}M
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Income', value: totalIncome, color: 'text-green-600 dark:text-green-400' },
          { label: 'Total Expenses', value: totalExpense, color: 'text-red-600 dark:text-red-400' },
          { label: 'Net Profit', value: totalIncome - totalExpense, color: 'text-blue-600 dark:text-blue-400' },
        ].map((item) => (
          <div key={item.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
            <p className={`text-2xl font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Monthly Bar Chart */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <CardTitle>Monthly Comparison</CardTitle>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
              <Legend />
              <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Profit Line Chart */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <CardTitle>Profit Trend</CardTitle>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Category Breakdown */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <CardTitle>Expense by Category</CardTitle>
        </div>
        {categoryData.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-400">
            <BarChart3 className="w-8 h-8 mb-2" />
            <p className="text-sm">No expense data available</p>
          </div>
        ) : (
          <div className="p-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                <Bar dataKey="amount" name="Amount" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
