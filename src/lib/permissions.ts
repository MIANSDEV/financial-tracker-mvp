import { useAuthStore } from '@/store/auth';
import type { RolePermissions } from '@/types';
import { DEFAULT_ROLE_PERMISSIONS } from '@/types';

const ALL_PERMISSIONS: RolePermissions = {
  canViewTransactions: true,
  canCreateTransactions: true,
  canEditTransactions: true,
  canDeleteTransactions: true,
  canViewReports: true,
  canViewAuditLogs: true,
  canManageUsers: true,
};

export function usePermissions(): RolePermissions {
  const { user, companyRoles } = useAuthStore();

  if (!user) return DEFAULT_ROLE_PERMISSIONS;
  if (user.role === 'super_admin' || user.role === 'admin') return ALL_PERMISSIONS;

  // Look up custom role by name; fall back to DEFAULT_ROLE_PERMISSIONS for backward compat
  const role = companyRoles.find((r) => r.name === user.role);
  return role?.permissions ?? DEFAULT_ROLE_PERMISSIONS;
}
