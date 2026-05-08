'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUser, getCompany } from '@/lib/firebase/firestore';
import { useAuthStore } from '@/store/auth';

export function useAuth() {
  const { user, company, loading, setUser, setCompany, setLoading, reset } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        reset();
        return;
      }

      try {
        const userData = await getUser(firebaseUser.uid);
        if (!userData) {
          reset();
          return;
        }

        setUser(userData);

        if (userData.companyId) {
          const companyData = await getCompany(userData.companyId);
          setCompany(companyData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        reset();
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return { user, company, loading };
}
