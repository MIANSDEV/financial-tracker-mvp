'use client';

import { useLanguageStore } from '@/store/language';
import { translations } from './translations';

export function useT() {
  const { language } = useLanguageStore();
  return translations[language];
}
