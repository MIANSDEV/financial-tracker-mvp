import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Company } from '@/types';

interface AuthState {
  user: User | null;
  company: Company | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setCompany: (company: Company | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      company: null,
      loading: true,
      setUser: (user) => set({ user }),
      setCompany: (company) => set({ company }),
      setLoading: (loading) => set({ loading }),
      reset: () => set({ user: null, company: null, loading: false }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user, company: state.company }),
    }
  )
);
