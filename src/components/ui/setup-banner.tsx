'use client';

import { AlertTriangle, ExternalLink, Database } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

type BannerState = 'checking' | 'firestore_offline' | 'no_doc' | 'ok';

export function SetupBanner() {
  const { user } = useAuthStore();
  const [state, setState] = useState<BannerState>('checking');

  useEffect(() => {
    if (!user) return;

    // If role is the fallback 'staff' with no company, something went wrong
    if (user.companyId !== null || user.role !== 'staff') {
      setState('ok');
      return;
    }

    // Probe Firestore to distinguish "offline" vs "doc missing"
    getDoc(doc(db, 'users', user.id))
      .then((snap) => {
        if (snap.exists()) {
          setState('ok'); // doc exists — role will refresh on next load
        } else {
          setState('no_doc');
        }
      })
      .catch((err: Error) => {
        const msg = err.message ?? '';
        if (msg.includes('offline') || msg.includes('unavailable') || msg.includes('UNAVAILABLE')) {
          setState('firestore_offline');
        } else {
          setState('no_doc');
        }
      });
  }, [user]);

  if (!user || state === 'ok' || state === 'checking') return null;

  if (state === 'firestore_offline') {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3.5">
        <Database className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            Firestore database not found
          </p>
          <p className="text-sm text-red-700 dark:text-red-400 mt-1">
            Firebase Auth is working, but the Firestore database doesn&apos;t exist yet.
            Create it in the Firebase Console:
          </p>
          <ol className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-400 list-decimal list-inside">
            <li>
              Open{' '}
              <a
                href={`https://console.firebase.google.com/project/${PROJECT_ID}/firestore`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline inline-flex items-center gap-1 font-medium"
              >
                Firestore Database
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Click <strong>Create database</strong></li>
            <li>Choose <strong>Production mode</strong> → pick a region → <strong>Done</strong></li>
            <li>Refresh this page</li>
          </ol>
          <p className="text-xs text-red-500 dark:text-red-400 mt-2">
            After creating the database you also need to add your user document (see below).
          </p>
        </div>
      </div>
    );
  }

  // state === 'no_doc'
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3.5">
      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Firestore user document missing
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
          Your login works but the Firestore record for your account was not created yet.
          Add it manually:
        </p>
        <ol className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-400 list-decimal list-inside">
          <li>
            Open{' '}
            <a
              href={`https://console.firebase.google.com/project/${PROJECT_ID}/firestore/data/users`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline inline-flex items-center gap-1 font-medium"
            >
              Firestore → users collection
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>
            Click <strong>Add document</strong> — Document ID:{' '}
            <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded text-xs font-mono break-all">
              {user.id}
            </code>
          </li>
          <li>Add these fields and <strong>Save</strong></li>
        </ol>
        <pre className="mt-2 text-xs bg-amber-100 dark:bg-amber-900/40 rounded-lg p-3 font-mono overflow-x-auto">
{`name      (string)  →  "Mians Super Admin"
email     (string)  →  "${user.email}"
role      (string)  →  "super_admin"
companyId (null)    →  null`}
        </pre>
        <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
          After saving, <button onClick={() => window.location.reload()} className="underline font-medium">refresh this page</button> to get full Super Admin access.
        </p>
      </div>
    </div>
  );
}
