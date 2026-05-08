import type { App } from 'firebase-admin/app';

let _app: App | null = null;

function getAdminApp(): App {
  if (_app) return _app;

  // Lazy import to prevent initialization during build
  const { initializeApp, getApps, cert } = require('firebase-admin/app');

  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app!;
  }

  _app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

  return _app!;
}

export function getAdminDb() {
  const { getFirestore } = require('firebase-admin/firestore');
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  const { getAuth } = require('firebase-admin/auth');
  return getAuth(getAdminApp());
}

export function getAdminMessaging() {
  const { getMessaging } = require('firebase-admin/messaging');
  return getMessaging(getAdminApp());
}

// Keep named exports for backwards compat – now lazy getters
export const adminDb = new Proxy({} as ReturnType<typeof getAdminDb>, {
  get(_target, prop) {
    return (getAdminDb() as Record<string | symbol, unknown>)[prop];
  },
});

export const adminAuth = new Proxy({} as ReturnType<typeof getAdminAuth>, {
  get(_target, prop) {
    return (getAdminAuth() as Record<string | symbol, unknown>)[prop];
  },
});

export const adminMessaging = new Proxy({} as ReturnType<typeof getAdminMessaging>, {
  get(_target, prop) {
    return (getAdminMessaging() as Record<string | symbol, unknown>)[prop];
  },
});
