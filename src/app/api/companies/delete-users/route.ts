import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await req.json();
    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // Verify the caller is a super_admin
    const decoded = await adminAuth.verifyIdToken(token);
    const callerDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find all Firebase Auth UIDs that belong to this company
    const usersSnap = await adminDb
      .collection('users')
      .where('companyId', '==', companyId)
      .get();

    const uids: string[] = usersSnap.docs.map((d: { id: string }) => d.id);

    if (uids.length > 0) {
      // deleteUsers can handle up to 1000 UIDs per call
      await adminAuth.deleteUsers(uids);
    }

    return NextResponse.json({ deleted: uids.length });
  } catch (err) {
    console.error('delete-users API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
