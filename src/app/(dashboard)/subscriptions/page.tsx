'use client';

import { useEffect, useState } from 'react';
import { Plus, CreditCard, CheckCircle, Clock, AlertTriangle, X, DollarSign } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import {
  getAllSubscriptionPayments,
  getAllCompanies,
  createSubscriptionPayment,
  markPaymentPaid,
  updateSubscriptionPayment,
  createNotification,
} from '@/lib/firebase/firestore';
import { formatDate, formatCurrency, addDays } from '@/lib/utils';
import type { SubscriptionPayment, Company, PaymentStatus } from '@/types';
import { SUBSCRIPTION_PLANS } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const schema = z.object({
  companyId: z.string().min(1, 'Select a company'),
  plan: z.enum(['free', 'basic', 'professional', 'enterprise']),
  dueDate: z.string().min(1, 'Due date required'),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const statusVariant: Record<PaymentStatus, 'success' | 'warning' | 'danger'> = {
  paid: 'success',
  pending: 'warning',
  overdue: 'danger',
};

const statusIcon: Record<PaymentStatus, React.ReactNode> = {
  paid: <CheckCircle className="w-4 h-4 text-green-500" />,
  pending: <Clock className="w-4 h-4 text-yellow-500" />,
  overdue: <AlertTriangle className="w-4 h-4 text-red-500" />,
};

export default function SubscriptionsPage() {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all');
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { plan: 'basic', dueDate: new Date().toISOString().split('T')[0] },
  });

  const watchPlan = watch('plan');
  const watchCompanyId = watch('companyId');
  const selectedCompany = companies.find((c) => c.id === watchCompanyId);

  const fetchAll = async () => {
    const [p, c] = await Promise.all([getAllSubscriptionPayments(), getAllCompanies()]);
    // Auto-mark overdue
    const now = new Date();
    const updated = p.map((pay) =>
      pay.status === 'pending' && new Date(pay.dueDate) < now
        ? { ...pay, status: 'overdue' as PaymentStatus }
        : pay
    );
    setPayments(updated);
    setCompanies(c);
    setLoading(false);
  };

  useEffect(() => {
    if (user?.role !== 'super_admin') { setLoading(false); return; }
    fetchAll();
  }, [user?.role]);

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <CreditCard className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium">Access Denied</p>
      </div>
    );
  }

  const filtered = filter === 'all' ? payments : payments.filter((p) => p.status === filter);

  const totalCollected = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter((p) => p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
  const activeCount = companies.filter((c) => c.status === 'active').length;

  const handleMarkPaid = async (payment: SubscriptionPayment) => {
    setMarkingPaid(payment.id);
    try {
      await markPaymentPaid(payment.id, payment.companyId, payment.periodEnd);
      if (user?.id) {
        await createNotification({
          userId: user.id,
          title: 'Payment received',
          message: `${payment.companyName} paid ${formatCurrency(payment.amount)} for the ${SUBSCRIPTION_PLANS[payment.plan].label} plan.`,
          type: 'financial',
          read: false,
          timestamp: new Date(),
        });
      }
      toast.success(`Payment marked as paid for ${payment.companyName}`);
      fetchAll();
    } catch {
      toast.error('Failed to mark as paid');
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleMarkOverdue = async (paymentId: string) => {
    try {
      await updateSubscriptionPayment(paymentId, { status: 'overdue' });
      setPayments((prev) => prev.map((p) => p.id === paymentId ? { ...p, status: 'overdue' } : p));
      toast.success('Marked as overdue');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleCreate = async (data: FormValues) => {
    const company = companies.find((c) => c.id === data.companyId);
    if (!company) return;
    const plan = SUBSCRIPTION_PLANS[data.plan];
    setSaving(true);
    try {
      const due = new Date(data.dueDate);
      const periodEnd = addDays(due, 30);
      await createSubscriptionPayment({
        companyId: company.id,
        companyName: company.name,
        plan: data.plan,
        amount: plan.price,
        status: 'pending',
        dueDate: due,
        paidAt: null,
        periodStart: due,
        periodEnd,
        notes: data.notes,
      });
      if (user?.id) {
        await createNotification({
          userId: user.id,
          title: 'Payment record added',
          message: `${company.name} — ${SUBSCRIPTION_PLANS[data.plan].label} plan, ${formatCurrency(plan.price)} due on ${new Date(data.dueDate).toLocaleDateString()}.`,
          type: 'financial',
          read: false,
          timestamp: new Date(),
        });
      }
      toast.success('Payment record created');
      reset();
      setModalOpen(false);
      fetchAll();
    } catch {
      toast.error('Failed to create payment record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Track subscription payments across all companies
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Add Payment Record
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Collected', value: formatCurrency(totalCollected), icon: <DollarSign className="w-5 h-5" />, color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' },
          { label: 'Pending', value: formatCurrency(totalPending), icon: <Clock className="w-5 h-5" />, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400' },
          { label: 'Overdue', value: formatCurrency(totalOverdue), icon: <AlertTriangle className="w-5 h-5" />, color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
          { label: 'Active Companies', value: String(activeCount), icon: <CheckCircle className="w-5 h-5" />, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/20 dark:text-brand-400' },
        ].map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.color)}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'overdue', 'paid'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
              filter === s
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            {s === 'all' ? `All (${payments.length})` : `${s} (${payments.filter((p) => p.status === s).length})`}
          </button>
        ))}
      </div>

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
            <CreditCard className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">No payment records</p>
            <p className="text-xs mt-1">Records are created automatically when you add a company</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Company', 'Plan', 'Amount', 'Due Date', 'Paid On', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{payment.companyName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(payment.periodStart)} → {formatDate(payment.periodEnd)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="purple">{SUBSCRIPTION_PLANS[payment.plan].label}</Badge>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                      {formatDate(payment.dueDate)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                      {payment.paidAt ? formatDate(payment.paidAt) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {statusIcon[payment.status]}
                        <Badge variant={statusVariant[payment.status]} className="capitalize">
                          {payment.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {payment.status !== 'paid' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMarkPaid(payment)}
                            disabled={markingPaid === payment.id}
                            className="px-2.5 py-1 rounded-lg text-xs bg-green-500 hover:bg-green-600 text-white font-medium disabled:opacity-50 transition-colors"
                          >
                            {markingPaid === payment.id ? '...' : 'Mark Paid'}
                          </button>
                          {payment.status === 'pending' && (
                            <button
                              onClick={() => handleMarkOverdue(payment.id)}
                              className="px-2.5 py-1 rounded-lg text-xs bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium transition-colors"
                            >
                              Overdue
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Payment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Payment Record</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(handleCreate)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                <select
                  {...register('companyId')}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select a company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.companyId && <p className="mt-1 text-xs text-red-500">{errors.companyId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</label>
                <select
                  {...register('plan')}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {Object.entries(SUBSCRIPTION_PLANS).filter(([, v]) => v.price > 0).map(([key, val]) => (
                    <option key={key} value={key}>{val.label} — {formatCurrency(val.price)}/mo</option>
                  ))}
                </select>
              </div>

              {/* Price preview */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Amount due</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(SUBSCRIPTION_PLANS[watchPlan]?.price ?? 0)}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                <input
                  {...register('dueDate')}
                  type="date"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.dueDate && <p className="mt-1 text-xs text-red-500">{errors.dueDate.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <input
                  {...register('notes')}
                  type="text"
                  placeholder="e.g. Renewal invoice #123"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" loading={saving} className="flex-1">Create Record</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
