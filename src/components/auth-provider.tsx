'use client';

import { useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUser, getCompany, getCompanyRoles } from '@/lib/firebase/firestore';
import { useAuthStore } from '@/store/auth';
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
    let callbackFired = false;

    // Safety net: if onAuthStateChanged never fires (expired token + no network,
    // IndexedDB unavailable on Android WebView, etc.) force loading:false after
    // 8 s so the spinner never hangs forever on web or APK.
    const bailout = setTimeout(() => {
      if (!callbackFired) {
        useAuthStore.getState().reset();
      }
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      callbackFired = true;
      clearTimeout(bailout);

      if (!firebaseUser) {
        reset();
        return;
      }

      // Only show the loading spinner when there is no cached user.
      // On return visits the store already has loading:false (persisted),
      // so Firebase validates the session silently in the background.
      if (!useAuthStore.getState().user) setLoading(true);

      try {
        const TIMED_OUT = Symbol('timeout');
        // 5 s is enough; offline Firestore rejects almost immediately anyway
        const userResult = await Promise.race([
          getUser(firebaseUser.uid),
          new Promise<typeof TIMED_OUT>((resolve) => setTimeout(() => resolve(TIMED_OUT), 5000)),
        ]);

        if (userResult === TIMED_OUT) {
          setUser(buildFallbackUser(firebaseUser));
          setLoading(false);
          return;
        }

        if (!userResult) {
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
          setUser(buildFallbackUser(firebaseUser));
        } else {
          console.error('Auth provider error:', error);
          setUser(buildFallbackUser(firebaseUser));
        }
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(bailout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Lazy-load Firebase Messaging — not in the critical bundle path
    import('@/lib/firebase/messaging').then(({ setupForegroundMessaging }) => {
      setupForegroundMessaging(({ title, body }) => {
        toast(
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-gray-600">{body}</p>
          </div>,
          { duration: 6000 }
        );
      });
    });
  }, []);

  return <>{children}</>;
}
