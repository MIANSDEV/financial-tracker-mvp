export type UserRole = 'super_admin' | 'admin' | string;

export type SubscriptionPlan = 'free' | 'basic' | 'professional' | 'enterprise';

export type CompanyStatus = 'active' | 'inactive' | 'suspended';

export type TransactionType = 'income' | 'expense';

export type NotificationType = 'system' | 'financial' | 'activity' | 'reports';

export interface RolePermissions {
  canViewTransactions: boolean;
  canCreateTransactions: boolean;
  canEditTransactions: boolean;
  canDeleteTransactions: boolean;
  canViewReports: boolean;
  canViewAuditLogs: boolean;
  canManageUsers: boolean;
}

export interface CompanyRole {
  id: string;
  companyId: string;
  name: string;
  permissions: RolePermissions;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  canViewTransactions: true,
  canCreateTransactions: true,
  canEditTransactions: true,
  canDeleteTransactions: false,
  canViewReports: false,
  canViewAuditLogs: false,
  canManageUsers: false,
};

export type PaymentStatus = 'paid' | 'pending' | 'overdue';

export interface SubscriptionPayment {
  id: string;
  companyId: string;
  companyName: string;
  plan: SubscriptionPlan;
  amount: number;
  status: PaymentStatus;
  dueDate: Date;
  paidAt: Date | null;
  periodStart: Date;
  periodEnd: Date;
  notes?: string;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionExpiresAt: Date | null;
  status: CompanyStatus;
  adminId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  companyId: string;
  name: string;
  type: TransactionType;
  createdAt: Date;
}

export interface Partner {
  id: string;
  companyId: string;
  name: string;
  createdAt: Date;
}

export interface SubCompany {
  id: string;
  companyId: string;
  name: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  companyId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: Date;
  createdBy: string;
  createdByName: string;
  partnerIds?: string[];
  partnerNames?: string[];
  attachmentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId?: string;
  companyId?: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  timestamp: Date;
}

export interface NotificationSettings {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  fcmToken?: string;
  types: {
    system: boolean;
    financial: boolean;
    activity: boolean;
    reports: boolean;
  };
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  profit: number;
  transactionCount: number;
  incomeChange: number;
  expenseChange: number;
  profitChange: number;
}

export interface ChartDataPoint {
  date: string;
  income: number;
  expense: number;
  profit: number;
}

export const TRANSACTION_CATEGORIES = {
  income: [
    'Sales',
    'Service Revenue',
    'Consulting',
    'Other Income',
  ],
  expense: [
    'Salaries',
    'Rent',
    'Utilities',
    'Other Expense',
  ],
} as const;

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, { label: string; price: number; features: string[] }> = {
  free: {
    label: 'Free',
    price: 0,
    features: ['Up to 50 transactions/month', '1 user', 'Basic reports'],
  },
  basic: {
    label: 'Basic',
    price: 29,
    features: ['Up to 500 transactions/month', '5 users', 'Advanced reports', 'Email notifications'],
  },
  professional: {
    label: 'Professional',
    price: 79,
    features: ['Unlimited transactions', '20 users', 'Full analytics', 'Push notifications', 'Export reports'],
  },
  enterprise: {
    label: 'Enterprise',
    price: 199,
    features: ['Unlimited everything', 'Unlimited users', 'Custom reports', 'Priority support', 'Audit logs'],
  },
};
