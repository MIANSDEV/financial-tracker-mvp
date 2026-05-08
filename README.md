# Financial Tracker — Mians IT Farm

A production-ready **multi-tenant SaaS Financial Tracker** built with Next.js 16, Firebase, and PWA features.

---

## Architecture Overview

```
financial-tracker/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Login page (no public registration)
│   │   ├── (dashboard)/           # Protected dashboard layout
│   │   │   ├── dashboard/         # Overview with charts
│   │   │   ├── transactions/      # CRUD with filters & export
│   │   │   ├── companies/         # Super Admin: tenant management
│   │   │   ├── users/             # Admin: user management
│   │   │   ├── reports/           # Charts, analytics, export
│   │   │   ├── notifications/     # Notification inbox
│   │   │   ├── audit-logs/        # Activity trail
│   │   │   └── settings/          # Profile + notification preferences
│   │   └── api/notifications/send/ # FCM push notification API
│   ├── components/
│   │   ├── layout/                # Sidebar, Topbar
│   │   ├── transactions/          # Transaction modal
│   │   └── ui/                    # Reusable components
│   ├── hooks/                     # useAuth, useNotifications
│   ├── lib/firebase/              # config, firestore, admin, messaging
│   ├── store/                     # Zustand: auth, notifications
│   └── types/                     # TypeScript interfaces
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── firebase-messaging-sw.js   # FCM background handler
│   └── icons/                     # PWA icons (72→512)
├── firestore.rules                # Security rules
├── firestore.indexes.json         # Composite indexes
└── scripts/
    ├── create-super-admin.js      # One-time admin setup
    └── generate-icons.js          # Icon generator
```

---

## Quick Start

### 1. Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → Email/Password
3. Enable **Firestore Database** → Production mode
4. Enable **Cloud Messaging**
5. Generate a **Web Push VAPID key** in Project Settings → Cloud Messaging

### 2. Configure Environment

Update `.env.local` with your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...   # Web push certificate

# Firebase Admin (Service Account)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Deploy Firestore Rules & Indexes

```bash
npm install -g firebase-tools
firebase login
firebase use --add your-project-id
firebase deploy --only firestore:rules,firestore:indexes
```

### 4. Create Super Admin

```bash
npm run setup:admin
# Default: admin@mians.com / SuperAdmin@123
# Change immediately after first login!
```

### 5. Run

```bash
npm run dev       # Development
npm run build     # Production build
npm start         # Start production server
```

---

## User Roles

| Role | Access |
|------|--------|
| `super_admin` | Full system: all companies, all data, create tenants |
| `admin` | Own company: manage users, transactions, reports |
| `staff` | Own company: add/view transactions only |

> **No public registration** — Super Admin creates companies; Admins create staff users.

---

## Key Features

### Multi-Tenant Architecture
- Each company is completely isolated via Firestore security rules
- `companyId` is enforced on every data query
- Super Admin has cross-tenant read access

### Push Notification System
**Before sending, the system checks:**
1. `pushEnabled` — global toggle
2. `types[notificationType]` — per-category toggle
3. Rate limiting — max 3/day per type (except system)
4. FCM token exists

**Notification Types:**
- 🔔 **System** — Subscription expiry, payment due (can override off)
- 💰 **Financial** — High expense alerts, daily summaries
- 📝 **Activity** — Transaction added/edited
- 📊 **Reports** — Weekly summaries

### PWA Features
- Installable on mobile/desktop
- Offline page caching via Workbox
- Background push notifications via service worker
- App shortcuts for Dashboard & Add Transaction

### Security
- Firestore rules enforce company isolation
- Staff cannot delete transactions
- Audit logs are immutable (no update/delete)
- Admin SDK only accessible server-side

---

## Sending a Notification (API)

```bash
POST /api/notifications/send
Content-Type: application/json

{
  "userId": "uid123",
  "title": "Subscription Expiring",
  "message": "Your plan expires in 3 days",
  "type": "system",
  "companyId": "company456"
}
```

---

## Deploying to Vercel

```bash
npx vercel
# Set all NEXT_PUBLIC_* and Firebase Admin env vars in Vercel dashboard
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS + dark mode |
| State | Zustand + TanStack Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| Push | Firebase Cloud Messaging |
| PWA | next-pwa + Workbox |
| Hosting | Vercel / Firebase Hosting |

---

© 2024 Mians IT Farm. All rights reserved.
# financial-tracker-mvp
