export async function notify(params: {
  userId: string;
  companyId?: string;
  title: string;
  message: string;
  type: 'system' | 'financial' | 'activity' | 'reports';
}) {
  try {
    await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch {
    // non-critical — never block the main action
  }
}
