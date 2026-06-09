'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { TrendingUp, TrendingDown, DollarSign, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { SetupBanner } from '@/components/ui/setup-banner';
import { useAuthStore } from '@/store/auth';
import { getTransactions } from '@/lib/firebase/firestore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Transaction, ChartDataPoint } from '@/types';
import {
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subYears,
  format,
  eachMonthOfInterval,
  parseISO,
} from 'date-fns';
import { useT } from '@/lib/i18n/use-t';

const PIE_COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4'];

type RangeMode = 'monthly' | 'yearly' | 'custom';

function buildChartData(transactions: Transaction[], from: Date, to: Date): ChartDataPoint[] {
  const monthRange = eachMonthOfInterval({ start: startOfMonth(from), end: startOfMonth(to) });
  return monthRange.map((month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const txns = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d >= start && d <= end;
    });
    const income = txns.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    const expense = txns.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
    return { date: format(month, 'MMM yy'), income, expense, profit: income - expense };
  });
}

function buildCategoryData(transactions: Transaction[]) {
  const map: Record<string, number> = {};
  transactions.filter((tx) => tx.type === 'expense').forEach((tx) => {
    map[tx.category] = (map[tx.category] || 0) + tx.amount;
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function calcStats(txns: Transaction[]) {
  const income = txns.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const expense = txns.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  return { income, expense, profit: income - expense, count: txns.length };
}

function pctChange(current: number, prev: number) {
  if (prev === 0) return 0;
  return ((current - prev) / Math.abs(prev)) * 100;
}

export default function DashboardPage() {
  const { user, company } = useAuthStore();
  const t = useT();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeMode, setRangeMode] = useState<RangeMode>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customFrom, setCustomFrom] = useState(() => format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (!company?.id) { setLoading(false); return; }
    getTransactions(company.id).then(setTransactions).finally(() => setLoading(false));
  }, [company?.id]);

  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? t.dashboard.morningGreet : hour < 18 ? t.dashboard.afternoonGreet : t.dashboard.eveningGreet;

  const { rangeStart, rangeEnd, prevStart, prevEnd, chartFrom, chartTo, rangeLabel } = useMemo(() => {
    if (rangeMode === 'monthly') {
      const s = startOfMonth(now);
      const e = endOfMonth(now);
      const ps = startOfMonth(subMonths(now, 1));
      const pe = endOfMonth(subMonths(now, 1));
      return {
        rangeStart: s, rangeEnd: e,
        prevStart: ps, prevEnd: pe,
        chartFrom: subMonths(s, 5), chartTo: e,
        rangeLabel: format(now, 'MMMM yyyy'),
      };
    }
    if (rangeMode === 'yearly') {
      const ref = new Date(selectedYear, 0, 1);
      const s = startOfYear(ref);
      const e = endOfYear(ref);
      const ps = startOfYear(subYears(ref, 1));
      const pe = endOfYear(subYears(ref, 1));
      return {
        rangeStart: s, rangeEnd: e,
        prevStart: ps, prevEnd: pe,
        chartFrom: s, chartTo: e,
        rangeLabel: String(selectedYear),
      };
    }
    // custom
    const s = parseISO(customFrom);
    const e = parseISO(customTo);
    const diffMs = Math.max(e.getTime() - s.getTime(), 0);
    const ps = new Date(s.getTime() - diffMs - 86400000);
    const pe = new Date(s.getTime() - 1);
    return {
      rangeStart: s, rangeEnd: e,
      prevStart: ps, prevEnd: pe,
      chartFrom: s, chartTo: e,
      rangeLabel: `${format(s, 'dd MMM yy')} – ${format(e, 'dd MMM yy')}`,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeMode, selectedYear, customFrom, customTo]);

  const periodTxns = transactions.filter((tx) => {
    const d = new Date(tx.date);
    return d >= rangeStart && d <= rangeEnd;
  });
  const prevTxns = transactions.filter((tx) => {
    const d = new Date(tx.date);
    return d >= prevStart && d <= prevEnd;
  });

  const cur = calcStats(periodTxns);
  const prev = calcStats(prevTxns);

  const chartData = useMemo(
    () => buildChartData(transactions, chartFrom, chartTo),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, chartFrom.getTime(), chartTo.getTime()]
  );
  const categoryData = useMemo(() => buildCategoryData(periodTxns), [periodTxns]);

  const recentTxns = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  if (!company?.id) {
    return (
      <div className="space-y-6">
        <SetupBanner />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{greet}, {user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t.dashboard.superAdminMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SetupBanner />

      {/* Header + Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {greet}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {company?.name || ''} · {rangeLabel}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(['monthly', 'yearly', 'custom'] as RangeMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setRangeMode(mode)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  rangeMode === mode
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                {mode === 'monthly' ? t.dashboard.monthly : mode === 'yearly' ? t.dashboard.yearly : t.dashboard.custom}
              </button>
            ))}
          </div>

          {/* Yearly year stepper */}
          {rangeMode === 'yearly' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedYear((y) => y - 1)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-12 text-center">
                {selectedYear}
              </span>
              <button
                onClick={() => setSelectedYear((y) => Math.min(y + 1, now.getFullYear()))}
                disabled={selectedYear >= now.getFullYear()}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Custom date pickers */}
          {rangeMode === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t.dashboard.from}</span>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t.dashboard.to}</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={format(now, 'yyyy-MM-dd')}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title={t.dashboard.totalIncome}
          value={cur.income}
          change={pctChange(cur.income, prev.income)}
          changeLabel={t.dashboard.vsLastPeriod}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title={t.dashboard.totalExpenses}
          value={cur.expense}
          change={pctChange(cur.expense, prev.expense)}
          changeLabel={t.dashboard.vsLastPeriod}
          icon={<TrendingDown className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          title={t.dashboard.profit}
          value={cur.profit}
          change={pctChange(cur.profit, prev.profit)}
          changeLabel={t.dashboard.vsLastPeriod}
          icon={<DollarSign className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title={t.dashboard.transactions}
          value={cur.count}
          icon={<Activity className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2" padding={false}>
          <div className="p-6 pb-2">
            <CardHeader>
              <CardTitle>{t.dashboard.revenueOverview}</CardTitle>
              <span className="text-xs text-gray-400 dark:text-gray-500">{rangeLabel}</span>
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
                  tickFormatter={(v) => `৳${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                />
                <Area type="monotone" dataKey="income" name={t.transactions.income} stroke="#22c55e" fill="url(#incomeGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name={t.transactions.expense} stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding={false}>
          <div className="p-6 pb-2">
            <CardHeader>
              <CardTitle>{t.dashboard.expenseBreakdown}</CardTitle>
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
                <p className="text-sm">{t.dashboard.noExpenseData}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <CardTitle>{t.dashboard.recentTransactions}</CardTitle>
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
            <p className="text-sm">{t.dashboard.noTransactions}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {recentTxns.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                    tx.type === 'income'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{tx.description}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{tx.category} · {formatDate(tx.date)}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${
                  tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
