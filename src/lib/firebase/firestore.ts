import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './config';
import type {
  User,
  Company,
  Transaction,
  Notification,
  NotificationSettings,
  AuditLog,
  SubscriptionPayment,
  CompanyRole,
  RolePermissions,
} from '@/types';

// ── Converters ──────────────────────────────────────────────────────────────

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as string);
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function getUser(userId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    id: snap.id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as User;
}

export async function createUser(userId: string, data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
  await setDoc(doc(db, 'users', userId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateUser(userId: string, data: Partial<User>) {
  await updateDoc(doc(db, 'users', userId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteUser(userId: string) {
  await deleteDoc(doc(db, 'users', userId));
}

export async function getCompanyUsers(companyId: string): Promise<User[]> {
  const q = query(
    collection(db, 'users'),
    where('companyId', '==', companyId),
    orderBy('name')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    ...d.data(),
    id: d.id,
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  })) as User[];
}

// ── Companies ────────────────────────────────────────────────────────────────

export async function getCompany(companyId: string): Promise<Company | null> {
  const snap = await getDoc(doc(db, 'companies', companyId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    id: snap.id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    subscriptionExpiresAt: data.subscriptionExpiresAt ? toDate(data.subscriptionExpiresAt) : null,
  } as Company;
}

export async function getAllCompanies(): Promise<Company[]> {
  const q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      subscriptionExpiresAt: data.subscriptionExpiresAt ? toDate(data.subscriptionExpiresAt) : null,
    };
  }) as Company[];
}

export async function createCompany(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'companies'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCompany(companyId: string, data: Partial<Company>) {
  await updateDoc(doc(db, 'companies', companyId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCompany(companyId: string) {
  await deleteDoc(doc(db, 'companies', companyId));
}

// ── Transactions ─────────────────────────────────────────────────────────────

export interface TransactionFilters {
  type?: 'income' | 'expense';
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>;
}

export async function getTransactions(
  companyId: string,
  filters?: TransactionFilters
): Promise<Transaction[]> {
  const constraints: QueryConstraint[] = [
    where('companyId', '==', companyId),
    orderBy('date', 'desc'),
  ];

  if (filters?.type) constraints.push(where('type', '==', filters.type));
  if (filters?.category) constraints.push(where('category', '==', filters.category));
  if (filters?.dateFrom) constraints.push(where('date', '>=', Timestamp.fromDate(filters.dateFrom)));
  if (filters?.dateTo) constraints.push(where('date', '<=', Timestamp.fromDate(filters.dateTo)));
  if (filters?.limit) constraints.push(limit(filters.limit));
  if (filters?.startAfterDoc) constraints.push(startAfter(filters.startAfterDoc));

  const q = query(collection(db, 'transactions'), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      date: toDate(data.date),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  }) as Transaction[];
}

export async function createTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'transactions'), {
    ...data,
    date: Timestamp.fromDate(new Date(data.date)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTransaction(transactionId: string, data: Partial<Transaction>) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
  if (data.date) updateData.date = Timestamp.fromDate(new Date(data.date));
  await updateDoc(doc(db, 'transactions', transactionId), updateData);
}

export async function deleteTransaction(transactionId: string) {
  await deleteDoc(doc(db, 'transactions', transactionId));
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function subscribeToNotifications(
  userId: string,
  companyId: string,
  callback: (notifications: Notification[]) => void
) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snap) => {
    const notifications = snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        timestamp: toDate(data.timestamp),
      };
    }) as Notification[];
    callback(notifications);
  }, (error) => {
    if (error.code === 'failed-precondition') {
      // Index not built yet — silently wait; the listener will recover once ready
      console.warn('Notifications index building — will retry when ready.');
    } else {
      console.error('Notification listener error:', error);
    }
  });
}

export async function markNotificationRead(notificationId: string) {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
}

export async function markAllNotificationsRead(userId: string) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  const updates = snap.docs.map((d) => updateDoc(d.ref, { read: true }));
  await Promise.all(updates);
}

export async function createNotification(data: Omit<Notification, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'notifications'), {
    ...data,
    timestamp: serverTimestamp(),
  });
  return ref.id;
}

// ── Notification Settings ────────────────────────────────────────────────────

export async function getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
  const snap = await getDoc(doc(db, 'notification_settings', userId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    updatedAt: toDate(data.updatedAt),
  } as NotificationSettings;
}

export async function upsertNotificationSettings(
  userId: string,
  settings: Partial<NotificationSettings>
) {
  await setDoc(
    doc(db, 'notification_settings', userId),
    { ...settings, userId, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

// ── Company Roles ─────────────────────────────────────────────────────────────

export async function getCompanyRoles(companyId: string): Promise<CompanyRole[]> {
  const q = query(
    collection(db, 'company_roles'),
    where('companyId', '==', companyId),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  }) as CompanyRole[];
}

export async function createCompanyRole(
  data: Omit<CompanyRole, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'company_roles'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCompanyRole(roleId: string, data: Partial<Pick<CompanyRole, 'name' | 'permissions'>>) {
  await updateDoc(doc(db, 'company_roles', roleId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCompanyRole(roleId: string) {
  await deleteDoc(doc(db, 'company_roles', roleId));
}

// ── Subscription Payments ─────────────────────────────────────────────────────

export async function createSubscriptionPayment(
  data: Omit<SubscriptionPayment, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'subscription_payments'), {
    ...data,
    dueDate: Timestamp.fromDate(new Date(data.dueDate)),
    paidAt: data.paidAt ? Timestamp.fromDate(new Date(data.paidAt)) : null,
    periodStart: Timestamp.fromDate(new Date(data.periodStart)),
    periodEnd: Timestamp.fromDate(new Date(data.periodEnd)),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getAllSubscriptionPayments(): Promise<SubscriptionPayment[]> {
  const q = query(
    collection(db, 'subscription_payments'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      dueDate: toDate(data.dueDate),
      paidAt: data.paidAt ? toDate(data.paidAt) : null,
      periodStart: toDate(data.periodStart),
      periodEnd: toDate(data.periodEnd),
      createdAt: toDate(data.createdAt),
    };
  }) as SubscriptionPayment[];
}

export async function markPaymentPaid(paymentId: string, companyId: string, periodEnd: Date) {
  await updateDoc(doc(db, 'subscription_payments', paymentId), {
    status: 'paid',
    paidAt: serverTimestamp(),
  });
  // Extend company subscription to the end of the paid period
  await updateDoc(doc(db, 'companies', companyId), {
    subscriptionExpiresAt: Timestamp.fromDate(periodEnd),
    status: 'active',
    updatedAt: serverTimestamp(),
  });
}

export async function updateSubscriptionPayment(
  paymentId: string,
  data: Partial<Pick<SubscriptionPayment, 'status' | 'notes' | 'dueDate'>>
) {
  const update: Record<string, unknown> = { ...data };
  if (data.dueDate) update.dueDate = Timestamp.fromDate(new Date(data.dueDate));
  await updateDoc(doc(db, 'subscription_payments', paymentId), update);
}

export async function createAuditLog(data: Omit<AuditLog, 'id' | 'timestamp'>) {
  await addDoc(collection(db, 'audit_logs'), {
    ...data,
    timestamp: serverTimestamp(),
  });
}

export async function getAuditLogs(companyId: string, pageLimit = 50): Promise<AuditLog[]> {
  const q = query(
    collection(db, 'audit_logs'),
    where('companyId', '==', companyId),
    orderBy('timestamp', 'desc'),
    limit(pageLimit)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      timestamp: toDate(data.timestamp),
    };
  }) as AuditLog[];
}
