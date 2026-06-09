/**
 * One-time migration: copies incomeCategories / expenseCategories arrays
 * from each company document into the new `categories` collection.
 *
 * Run: node scripts/migrate-categories.js
 */

require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

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

async function migrate() {
  const companiesSnap = await db.collection('companies').get();
  let totalCreated = 0;

  for (const companyDoc of companiesSnap.docs) {
    const { incomeCategories = [], expenseCategories = [] } = companyDoc.data();

    if (!incomeCategories.length && !expenseCategories.length) continue;

    // Check if categories already migrated for this company
    const existing = await db
      .collection('categories')
      .where('companyId', '==', companyDoc.id)
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log(`[skip] ${companyDoc.id} — already has categories`);
      continue;
    }

    const batch = db.batch();
    for (const name of incomeCategories) {
      const ref = db.collection('categories').doc();
      batch.set(ref, {
        companyId: companyDoc.id,
        name,
        type: 'income',
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    for (const name of expenseCategories) {
      const ref = db.collection('categories').doc();
      batch.set(ref, {
        companyId: companyDoc.id,
        name,
        type: 'expense',
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();

    const count = incomeCategories.length + expenseCategories.length;
    totalCreated += count;
    console.log(`[done] ${companyDoc.id} — ${count} categories created`);
  }

  console.log(`\nMigration complete. ${totalCreated} category docs created.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
