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
  onSave: (data: FormValues & { partnerIds: string[] }) => Promise<void>;
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
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'income', date: format(new Date(), 'yyyy-MM-dd') },
  });

  const t = useT();
  const selectedType = watch('type');
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);

  const filteredCategories = categories.filter((c) => c.type === selectedType);

  useEffect(() => {
    if (transaction) {
      reset({
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description,
        date: format(new Date(transaction.date), 'yyyy-MM-dd'),
      });
      setSelectedPartnerIds(transaction.partnerIds ?? []);
    } else {
      reset({ type: 'income', date: format(new Date(), 'yyyy-MM-dd') });
      setSelectedPartnerIds([]);
    }
  }, [transaction, open]);

  if (!open) return null;

  const handleFormSubmit = (data: FormValues) => {
    return onSave({ ...data, partnerIds: selectedPartnerIds });
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
                <label
                  key={type}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer text-sm font-medium capitalize transition-all',
                    selectedType === type
                      ? type === 'income'
                        ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                        : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  )}
                >
                  <input {...register('type')} type="radio" value={type} className="sr-only" />
                  {type === 'income' ? '↑' : '↓'} {type === 'income' ? t.transactions.income : t.transactions.expense}
                </label>
              ))}
            </div>
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

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t.common.cancel}
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              {transaction ? t.common.update : t.transactions.addTransaction}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
