'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PartnerMultiSelect } from '@/components/ui/partner-multi-select';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-t';
import type { Transaction, Category, Partner } from '@/types';
import { format } from 'date-fns';

const schema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
});

type FormValues = z.infer<typeof schema>;

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: FormValues & { partnerIds: string[]; alsoAdd?: { type: 'income' | 'expense'; category: string; amount: number; date: string } }) => Promise<void>;
  transaction?: Transaction | null;
  loading?: boolean;
  categories?: Category[];
  partners?: Partner[];
}

export function TransactionModal({
  open,
  onClose,
  onSave,
  transaction,
  loading = false,
  categories = [],
  partners = [],
}: TransactionModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: transaction
      ? {
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category,
          description: transaction.description,
          date: format(new Date(transaction.date), 'yyyy-MM-dd'),
        }
      : { type: 'income', date: format(new Date(), 'yyyy-MM-dd') },
  });

  const t = useT();
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>(transaction?.type ?? 'income');
  const selectedCategory = watch('category');
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);
  const [mirrorEnabled, setMirrorEnabled] = useState(false);
  const [mirrorCategory, setMirrorCategory] = useState('');
  const [mirrorAmountMode, setMirrorAmountMode] = useState<'full' | 'custom'>('full');
  const [mirrorCustomAmount, setMirrorCustomAmount] = useState('');
  const [mirrorDate, setMirrorDate] = useState('');

  // Remember the last chosen category for each type independently so switching
  // income → expense → income restores what the user had picked.
  const categoryMemory = useState<{ income: string; expense: string }>({ income: '', expense: '' })[0];

  const filteredCategories = categories.filter((c) => c.type === selectedType);
  const mirrorCategories = categories.filter((c) => c.type !== selectedType);

  // When type radio changes: save current category for old type, restore for new type
  const handleTypeChange = (newType: 'income' | 'expense') => {
    categoryMemory[selectedType] = selectedCategory ?? '';
    setSelectedType(newType);
    setValue('type', newType, { shouldValidate: false });
    setValue('category', categoryMemory[newType] ?? '', { shouldValidate: false });
    setMirrorCategory('');
  };

  useEffect(() => {
    if (transaction) {
      reset({
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description,
        date: format(new Date(transaction.date), 'yyyy-MM-dd'),
      });
      setSelectedType(transaction.type);
      setSelectedPartnerIds(transaction.partnerIds ?? []);
      categoryMemory.income = transaction.type === 'income' ? transaction.category : '';
      categoryMemory.expense = transaction.type === 'expense' ? transaction.category : '';
    } else {
      reset({ type: 'income', date: format(new Date(), 'yyyy-MM-dd') });
      setSelectedType('income');
      setSelectedPartnerIds([]);
      categoryMemory.income = '';
      categoryMemory.expense = '';
    }
    setMirrorEnabled(false);
    setMirrorCategory('');
    setMirrorAmountMode('full');
    setMirrorCustomAmount('');
    setMirrorDate('');
  }, [transaction, open]);

  if (!open) return null;

  const handleFormSubmit = (data: FormValues) => {
    const alsoAdd = mirrorEnabled && mirrorCategory
      ? {
          type: (selectedType === 'income' ? 'expense' : 'income') as 'income' | 'expense',
          category: mirrorCategory,
          amount: mirrorAmountMode === 'custom' && mirrorCustomAmount
            ? parseFloat(mirrorCustomAmount)
            : data.amount,
          date: mirrorDate || data.date,
        }
      : undefined;
    return onSave({ ...data, partnerIds: selectedPartnerIds, alsoAdd });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {transaction ? t.transactions.editTransaction : t.transactions.addTransaction}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.transactions.type}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['income', 'expense'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium capitalize transition-all',
                    selectedType === type
                      ? type === 'income'
                        ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                        : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  )}
                >
                  {type === 'income' ? '↑' : '↓'} {type === 'income' ? t.transactions.income : t.transactions.expense}
                </button>
              ))}
            </div>
            <input {...register('type')} type="hidden" />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.transactions.amount}
            </label>
            <input
              {...register('amount')}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                errors.amount ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
              )}
            />
            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.transactions.category}
            </label>
            <select
              {...register('category')}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                errors.category ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
              )}
            >
              <option value="">{t.transactions.selectCategory}</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>}
          </div>

          {/* Partners */}
          {partners.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t.transactions.selectPartner}
              </label>
              <PartnerMultiSelect
                partners={partners}
                selected={selectedPartnerIds}
                onChange={setSelectedPartnerIds}
                placeholder={t.transactions.selectPartner}
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.transactions.description}
            </label>
            <input
              {...register('description')}
              type="text"
              placeholder={t.transactions.descPlaceholder}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                errors.description ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
              )}
            />
            {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.transactions.date}
            </label>
            <input
              {...register('date')}
              type="date"
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                errors.date ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
              )}
            />
            {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>}
          </div>

          {/* Also add as opposite type */}
          <div className="pt-1 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Also add as <strong>{selectedType === 'income' ? 'expense' : 'income'}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setMirrorEnabled((v) => !v);
                  setMirrorCategory('');
                  setMirrorAmountMode('full');
                  setMirrorCustomAmount('');
                  setMirrorDate('');
                }}
                className={cn(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                  mirrorEnabled ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'
                )}
              >
                <span className={cn(
                  'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                  mirrorEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                )} />
              </button>
            </div>

            {mirrorEnabled && (
              <div className="rounded-xl border border-brand-200 dark:border-brand-800/60 bg-brand-50/50 dark:bg-brand-900/10 p-3 space-y-3">
                {/* Mirror category */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {selectedType === 'income' ? 'Expense' : 'Income'} category
                  </label>
                  <select
                    value={mirrorCategory}
                    onChange={(e) => setMirrorCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select category…</option>
                    {mirrorCategories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Mirror amount — full or custom */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Amount</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setMirrorAmountMode('full'); setMirrorCustomAmount(''); }}
                      className={cn(
                        'flex-1 py-2 rounded-lg border text-sm font-medium transition-all',
                        mirrorAmountMode === 'full'
                          ? 'border-brand-500 bg-brand-600 text-white'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                      )}
                    >
                      Full ({watch('amount') || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMirrorAmountMode('custom')}
                      className={cn(
                        'flex-1 py-2 rounded-lg border text-sm font-medium transition-all',
                        mirrorAmountMode === 'custom'
                          ? 'border-brand-500 bg-brand-600 text-white'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                      )}
                    >
                      Custom
                    </button>
                  </div>
                  {mirrorAmountMode === 'custom' && (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={mirrorCustomAmount}
                      onChange={(e) => setMirrorCustomAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  )}
                </div>

                {/* Mirror date */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Date <span className="font-normal text-gray-400">(leave blank to use same date)</span>
                  </label>
                  <input
                    type="date"
                    value={mirrorDate}
                    onChange={(e) => setMirrorDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t.common.cancel}
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              {mirrorEnabled && mirrorCategory ? 'Add Both' : transaction ? t.common.update : t.transactions.addTransaction}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
