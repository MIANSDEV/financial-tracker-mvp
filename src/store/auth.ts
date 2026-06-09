import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Company, CompanyRole } from '@/types';

interface AuthState {
  user: User | null;
  company: Company | null;
  companyRoles: CompanyRole[];
  loading: boolean;
  setUser: (user: User | null) => void;
  setCompany: (company: Company | null) => void;
  setCompanyRoles: (roles: CompanyRole[]) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      company: null,
      companyRoles: [],
      loading: true,
      setUser: (user) => set({ user }),
      setCompany: (company) => set({ company }),
      setCompanyRoles: (companyRoles) => set({ companyRoles }),
      setLoading: (loading) => set({ loading }),
      reset: () => set({ user: null, company: null, companyRoles: [], loading: false }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user, company: state.company }),
      onRehydrateStorage: () => (state) => {
        // If localStorage has a cached user, render content immediately.
        // Firebase will re-validate the session silently in the background.
        if (state?.user) {
          state.loading = false;
        }
      },
    }
  )
);
