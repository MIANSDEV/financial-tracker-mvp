'use client';

import { useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUser, getCompany, getCompanyRoles } from '@/lib/firebase/firestore';
import { useAuthStore } from '@/store/auth';
import { setupForegroundMessaging } from '@/lib/firebase/messaging';
import toast from 'react-hot-toast';

function buildFallbackUser(firebaseUser: { uid: string; displayName?: string | null; email?: string | null }) {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    email: firebaseUser.email || '',
    role: 'staff' as const,
    companyId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setCompany, setCompanyRoles, setLoading, reset } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        reset();
        return;
      }

      try {
        const TIMED_OUT = Symbol('timeout');
        // Add a timeout so "offline" Firestore doesn't hang forever
        const userResult = await Promise.race([
          getUser(firebaseUser.uid),
          new Promise<typeof TIMED_OUT>((resolve) => setTimeout(() => resolve(TIMED_OUT), 8000)),
        ]);

        if (userResult === TIMED_OUT) {
          // Firestore unreachable — let the user in with Auth data as fallback
          setUser(buildFallbackUser(firebaseUser));
          setLoading(false);
          return;
        }

        if (!userResult) {
          // User document was deleted (company removed) — force sign-out
          await signOut(auth);
          reset();
          return;
        }

        const userData = userResult;
        setUser(userData);

        if (userData.companyId) {
          const [companyResult, rolesResult] = await Promise.allSettled([
            getCompany(userData.companyId),
            getCompanyRoles(userData.companyId),
          ]);

          // If company was deleted while this user was active, sign them out
          if (companyResult.status === 'fulfilled' && !companyResult.value) {
            await signOut(auth);
            reset();
            return;
          }

          if (companyResult.status === 'fulfilled' && companyResult.value) {
            setCompany(companyResult.value);
          }
          if (rolesResult.status === 'fulfilled') setCompanyRoles(rolesResult.value);
        }
      } catch (error: unknown) {
        const msg = (error as Error)?.message ?? '';
        const isOffline =
          msg.includes('offline') ||
          msg.includes('unavailable') ||
          msg.includes('UNAVAILABLE');

        if (isOffline) {
          // Firestore not reachable — still let the user in with Auth data
          setUser(buildFallbackUser(firebaseUser));
        } else {
          console.error('Auth provider error:', error);
          setUser(buildFallbackUser(firebaseUser));
        }
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    setupForegroundMessaging(({ title, body }) => {
      toast(
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-gray-600">{body}</p>
        </div>,
        { duration: 6000 }
      );
    });
  }, []);

  return <>{children}</>;
}
