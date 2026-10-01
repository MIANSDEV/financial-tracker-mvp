/**
 * Wipes ALL company data so the platform starts fresh.
 * Super admin accounts (Firestore doc + Firebase Auth) are kept.
 *
 * Deletes: companies, branches, transactions, categories, partners,
 * company_roles, audit_logs, subscription_payments, notifications and
 * notification_settings of non-super-admin users, every non-super-admin
 * user doc, and their Firebase Auth accounts.
 *
 * Dry run (counts only):  node scripts/reset-company-data.js
 * Actually delete:        node scripts/reset-company-data.js --confirm
 * Add --everything to also clear the super admin's own notifications and
 * notification settings (the super admin login itself is always kept).
 */

require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const auth = getAuth();
const CONFIRM = process.argv.includes('--confirm');
const EVERYTHING = process.argv.includes('--everything');

const WIPE_COLLECTIONS = [
  'companies',
  'branches',
  'transactions',
  'categories',
  'partners',
  'company_roles',
  'audit_logs',
  'subscription_payments',
];

async function deleteDocs(refs) {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

async function main() {
  console.log(`Project: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(CONFIRM ? 'MODE: DELETE\n' : 'MODE: DRY RUN (pass --confirm to delete)\n');

  // Users — keep super admins
  const usersSnap = await db.collection('users').get();
  const superAdmins = usersSnap.docs.filter((d) => d.data().role === 'super_admin');
  const doomedUsers = usersSnap.docs.filter((d) => d.data().role !== 'super_admin');
  const keepUids = new Set(superAdmins.map((d) => d.id));

  console.log(`Keeping ${superAdmins.length} super admin(s): ${superAdmins.map((d) => d.data().email).join(', ')}`);
  if (superAdmins.length === 0) {
    console.error('No super_admin user found — aborting so you are not locked out.');
    process.exit(1);
  }

  const plan = [];
  for (const name of WIPE_COLLECTIONS) {
    const snap = await db.collection(name).get();
    plan.push({ name, refs: snap.docs.map((d) => d.ref) });
  }

  // --everything also clears the super admin's own notifications and settings
  const keepSuperAdminData = !EVERYTHING;

  const notifSnap = await db.collection('notifications').get();
  plan.push({ name: 'notifications', refs: notifSnap.docs.filter((d) => !(keepSuperAdminData && keepUids.has(d.data().userId))).map((d) => d.ref) });

  const settingsSnap = await db.collection('notification_settings').get();
  plan.push({ name: 'notification_settings', refs: settingsSnap.docs.filter((d) => !(keepSuperAdminData && keepUids.has(d.id))).map((d) => d.ref) });

  plan.push({ name: 'users', refs: doomedUsers.map((d) => d.ref) });

  for (const { name, refs } of plan) console.log(`  ${name.padEnd(22)} ${refs.length}`);
  console.log(`  ${'auth accounts'.padEnd(22)} ${doomedUsers.length}`);

  if (!CONFIRM) {
    console.log('\nDry run only. Nothing was deleted.');
    process.exit(0);
  }

  for (const { name, refs } of plan) {
    await deleteDocs(refs);
    console.log(`[done] ${name} — ${refs.length} deleted`);
  }

  const uids = doomedUsers.map((d) => d.id);
  for (let i = 0; i < uids.length; i += 1000) {
    const res = await auth.deleteUsers(uids.slice(i, i + 1000));
    if (res.failureCount) console.warn(`  ${res.failureCount} auth deletions failed (likely already gone)`);
  }
  console.log(`[done] auth accounts — ${uids.length} processed`);

  console.log('\nReset complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
