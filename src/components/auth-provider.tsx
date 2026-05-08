'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUser, getCompany } from '@/lib/firebase/firestore';
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
  const { setUser, setCompany, setLoading, reset } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        reset();
        return;
      }

      try {
        // Add a timeout so "offline" Firestore doesn't hang forever
        const userData = await Promise.race([
          getUser(firebaseUser.uid),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
        ]);

        if (!userData) {
          // No Firestore doc OR timeout — use Firebase Auth data as fallback
          setUser(buildFallbackUser(firebaseUser));
          setLoading(false);
          return;
        }

        setUser(userData);

        if (userData.companyId) {
          try {
            const companyData = await getCompany(userData.companyId);
            setCompany(companyData);
          } catch {
            // Company fetch failed — continue without it
          }
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
