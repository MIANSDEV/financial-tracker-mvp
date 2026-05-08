'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { SetupBanner } from '@/components/ui/setup-banner';
import { useAuthStore } from '@/store/auth';
import { getTransactions } from '@/lib/firebase/firestore';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Transaction, ChartDataPoint } from '@/types';
import { subMonths, startOfMonth, endOfMonth, format, eachMonthOfInterval } from 'date-fns';

const PIE_COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4'];

function buildChartData(transactions: Transaction[], months = 6): ChartDataPoint[] {
  const now = new Date();
  const monthRange = eachMonthOfInterval({
    start: subMonths(now, months - 1),
    end: now,
  });

  return monthRange.map((month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const monthTxns = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
    const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return {
      date: format(month, 'MMM yy'),
      income,
      expense,
      profit: income - expense,
    };
  });
}

function buildCategoryData(transactions: Transaction[]) {
  const map: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

export default function DashboardPage() {
  const { user, company } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) {
      setLoading(false);
      return;
    }
    getTransactions(company.id)
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, [company?.id]);

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const thisMonth = transactions.filter((t) => new Date(t.date) >= thisMonthStart);
  const lastMonth = transactions.filter(
    (t) => new Date(t.date) >= lastMonthStart && new Date(t.date) <= lastMonthEnd
  );

  const income = thisMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = thisMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = income - expense;

  const lastIncome = lastMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const lastExpense = lastMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const lastProfit = lastIncome - lastExpense;

  const incomeChange = lastIncome === 0 ? 0 : ((income - lastIncome) / lastIncome) * 100;
  const expenseChange = lastExpense === 0 ? 0 : ((expense - lastExpense) / lastExpense) * 100;
  const profitChange = lastProfit === 0 ? 0 : ((profit - lastProfit) / Math.abs(lastProfit)) * 100;

  const chartData = buildChartData(transactions);
  const categoryData = buildCategoryData(transactions);

  const recentTxns = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  if (!company?.id) {
    return (
      <div className="space-y-6">
        <SetupBanner />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
            {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            You&apos;re logged in as Super Admin. Manage companies from the Companies page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SetupBanner />
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
          {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Here&apos;s what&apos;s happening with {company?.name || 'your finances'} this month.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Income"
          value={income}
          change={incomeChange}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Total Expenses"
          value={expense}
          change={expenseChange}
          icon={<TrendingDown className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          title="Net Profit"
          value={profit}
          change={profitChange}
          icon={<DollarSign className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Transactions"
          value={thisMonth.length}
          icon={<Activity className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Area Chart */}
        <Card className="xl:col-span-2" padding={false}>
          <div className="p-6 pb-2">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
              <span className="text-xs text-gray-400 dark:text-gray-500">Last 6 months</span>
            </CardHeader>
          </div>
          <div className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                />
                <Area type="monotone" dataKey="income" name="Income" stroke="#22c55e" fill="url(#incomeGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="Expenses" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pie Chart */}
        <Card padding={false}>
          <div className="p-6 pb-2">
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
          </div>
          <div className="px-2 pb-4">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-600">
                <p className="text-sm">No expense data</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <CardTitle>Recent Transactions</CardTitle>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-6 w-6 text-brand-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : recentTxns.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400 dark:text-gray-600">
            <Activity className="w-10 h-10 mb-2" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {recentTxns.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                      t.type === 'income'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t.description}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{t.category} · {formatDate(t.date)}</p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
