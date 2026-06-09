'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Partner } from '@/types';

interface PartnerMultiSelectProps {
  partners: Partner[];
  selected: string[]; // array of partner IDs
  onChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function PartnerMultiSelect({
  partners,
  selected,
  onChange,
  placeholder = 'Partner (optional)',
  className,
}: PartnerMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? partners.find((p) => p.id === selected[0])?.name ?? placeholder
      : `${selected.length} partners selected`;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors',
          'bg-white dark:bg-gray-800 dark:text-white',
          open
            ? 'border-brand-500 ring-2 ring-brand-500/20'
            : 'border-gray-300 dark:border-gray-600',
          selected.length > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn('w-4 h-4 shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          {partners.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">No partners added yet</p>
          ) : (
            <ul className="py-1 max-h-48 overflow-y-auto">
              {partners.map((p) => {
                const checked = selected.includes(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                        checked
                          ? 'bg-brand-600 border-brand-600'
                          : 'border-gray-300 dark:border-gray-600'
                      )}>
                        {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </span>
                      <span className={cn('text-gray-700 dark:text-gray-300', checked && 'font-medium text-gray-900 dark:text-white')}>
                        {p.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {selected.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-1.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
