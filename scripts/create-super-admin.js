/**
 * Creates the Super Admin account using the Firebase REST API.
 * Uses NEXT_PUBLIC_FIREBASE_API_KEY + NEXT_PUBLIC_FIREBASE_PROJECT_ID from .env.local
 *
 * Usage: npm run setup:admin
 *
 * PREREQUISITES (do these first in Firebase Console):
 *   1. Authentication → Sign-in method → Email/Password → Enable
 *   2. Firestore Database → Create database (Production mode)
 */

require('dotenv').config({ path: '.env.local' });

const https = require('https');

const API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// ── Validation ────────────────────────────────────────────────────────────────
if (!API_KEY || API_KEY.startsWith('your_')) {
  console.error('❌  NEXT_PUBLIC_FIREBASE_API_KEY is not set in .env.local');
  process.exit(1);
}
if (!PROJECT_ID || PROJECT_ID.startsWith('your_')) {
  console.error('❌  NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set in .env.local');
  process.exit(1);
}

const EMAIL    = process.env.SUPER_ADMIN_EMAIL    || 'admin@mians.com';
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';
const NAME     = 'Mians Super Admin';

// ── Simple HTTPS helper (no extra deps) ──────────────────────────────────────
function request(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req  = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function firestorePatch(uid, idToken, fields) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ fields });
    const path =
      `/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}` +
      '?updateMask.fieldPaths=name&updateMask.fieldPaths=email' +
      '&updateMask.fieldPaths=role&updateMask.fieldPaths=companyId' +
      '&updateMask.fieldPaths=createdAt&updateMask.fieldPaths=updatedAt';

    const req = https.request(
      {
        hostname: 'firestore.googleapis.com',
        path,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Authorization: `Bearer ${idToken}`,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => resolve({ status: res.statusCode, body: raw }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  Financial Tracker — Super Admin Setup');
  console.log('─────────────────────────────────────────');
  console.log(`   Project : ${PROJECT_ID}`);
  console.log(`   Email   : ${EMAIL}`);
  console.log('─────────────────────────────────────────\n');

  // Step 1: Create user (or sign in if exists)
  let uid, idToken;

  console.log('Step 1/2  Creating Firebase Auth account...');
  const signUpRes = await request(
    'identitytoolkit.googleapis.com',
    `/v1/accounts:signUp?key=${API_KEY}`,
    { email: EMAIL, password: PASSWORD, returnSecureToken: true }
  );

  if (signUpRes.status === 200) {
    uid     = signUpRes.body.localId;
    idToken = signUpRes.body.idToken;
    console.log(`          ✓ Auth user created (uid: ${uid})`);
  } else {
    const errorCode = signUpRes.body?.error?.message || '';

    if (errorCode === 'EMAIL_EXISTS') {
      console.log('          ℹ  User exists — signing in to get token...');
      const signInRes = await request(
        'identitytoolkit.googleapis.com',
        `/v1/accounts:signInWithPassword?key=${API_KEY}`,
        { email: EMAIL, password: PASSWORD, returnSecureToken: true }
      );
      if (signInRes.status !== 200) {
        throw new Error(`Sign-in failed: ${signInRes.body?.error?.message || signInRes.status}`);
      }
      uid     = signInRes.body.localId;
      idToken = signInRes.body.idToken;
      console.log(`          ✓ Signed in (uid: ${uid})`);
    } else if (errorCode === 'CONFIGURATION_NOT_FOUND' || errorCode.includes('CONFIGURATION')) {
      console.error('\n❌  Email/Password authentication is NOT enabled.\n');
      console.error('   Fix it in 30 seconds:');
      console.error(`   1. Open: https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers`);
      console.error('   2. Click "Email/Password"');
      console.error('   3. Toggle "Enable" → Save\n');
      process.exit(1);
    } else {
      throw new Error(`Auth sign-up failed: ${errorCode || signUpRes.status}`);
    }
  }

  // Step 2: Write Firestore document
  console.log('\nStep 2/2  Writing Firestore user document...');
  const fsRes = await firestorePatch(uid, idToken, {
    name:      { stringValue: NAME },
    email:     { stringValue: EMAIL },
    role:      { stringValue: 'super_admin' },
    companyId: { nullValue: 'NULL_VALUE' },
    createdAt: { timestampValue: new Date().toISOString() },
    updatedAt: { timestampValue: new Date().toISOString() },
  });

  if (fsRes.status === 200) {
    console.log('          ✓ Firestore document written');
  } else if (fsRes.status === 403) {
    console.log('          ⚠️  Firestore rules blocked the write (expected if rules are strict).');
    console.log('');
    console.log('          Manual step — add the document in Firebase Console:');
    console.log(`          URL: https://console.firebase.google.com/project/${PROJECT_ID}/firestore`);
    console.log('          Collection: users');
    console.log(`          Document ID: ${uid}`);
    console.log('          Fields:');
    console.log(`            name      (string)  : ${NAME}`);
    console.log(`            email     (string)  : ${EMAIL}`);
    console.log('            role      (string)  : super_admin');
    console.log('            companyId (null)    : null');
  } else {
    console.log(`          ⚠️  Unexpected response (${fsRes.status}) — create the document manually (see above).`);
  }

  console.log('\n✅  Setup complete!');
  console.log('─────────────────────────────────────────');
  console.log(`   Email    : ${EMAIL}`);
  console.log(`   Password : ${PASSWORD}`);
  console.log('─────────────────────────────────────────');
  console.log('👉  Login: http://localhost:3000/login');
  console.log('⚠️   Change your password after first login!\n');
}

main().catch((err) => {
  console.error('\n❌  Error:', err.message);
  process.exit(1);
});
