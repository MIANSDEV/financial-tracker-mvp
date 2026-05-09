'use client';

import { useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { getAuditLogs } from '@/lib/firebase/firestore';
import { formatDateTime, exportToCSV } from '@/lib/utils';
import type { AuditLog } from '@/types';
import { useT } from '@/lib/i18n/use-t';

const actionVariant: Record<string, 'success' | 'info' | 'danger' | 'warning'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'warning',
};

export default function AuditLogsPage() {
  const { user, company } = useAuthStore();
  const t = useT();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const canView = user?.role === 'super_admin' || user?.role === 'admin';

  useEffect(() => {
    if (!company?.id || !canView) {
      setLoading(false);
      return;
    }
    getAuditLogs(company.id, 100)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [company?.id]);

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <FileText className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium">{t.common.accessDenied}</p>
        <p className="text-sm mt-1">{t.auditLogs.accessDeniedDesc}</p>
      </div>
    );
  }

  const handleExport = () => {
    exportToCSV(
      logs.map((l) => ({
        Timestamp: formatDateTime(l.timestamp),
        User: l.userName,
        Action: l.action,
        Resource: l.resource,
        'Resource ID': l.resourceId,
      })),
      'audit-logs'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.auditLogs.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {logs.length} {t.auditLogs.activityRecords}
          </p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport}>
          {t.auditLogs.export}
        </Button>
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-6 w-6 text-brand-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400 dark:text-gray-600">
            <FileText className="w-10 h-10 mb-3" />
            <p className="text-sm">{t.auditLogs.noLogs}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {[t.auditLogs.timestamp, t.auditLogs.user, t.auditLogs.action, t.auditLogs.resource, t.auditLogs.details].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-3.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{log.userName}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={actionVariant[log.action] || 'default'}>{log.action}</Badge>
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-400 capitalize">
                      {log.resource}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-gray-400 dark:text-gray-500 font-mono truncate max-w-[200px]">
                      {log.resourceId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
