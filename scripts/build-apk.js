/**
 * Builds a sideload-ready Android APK using Bubblewrap + Android cmdline-tools.
 * Run: node scripts/build-apk.js
 *
 * Pre-requisites (auto-handled by this script):
 *   - JDK 17 (installed at C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot)
 *   - Android cmdline-tools (at ~/.bubblewrap/android_sdk)
 *   - @bubblewrap/cli (npm install -g @bubblewrap/cli)
 *
 * Output: public/downloads/financial-tracker.apk
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT       = path.join(__dirname, '..');
const APK_DIR    = path.join(ROOT, 'android-apk');
const OUT_DIR    = path.join(ROOT, 'public', 'downloads');
const MANIFEST   = path.join(ROOT, 'twa-manifest.json');
const SDK_ROOT   = path.join(process.env.USERPROFILE || process.env.HOME, '.bubblewrap', 'android_sdk');
const JDK_PATH   = 'C:\\Program Files\\Microsoft\\jdk-17.0.19.10-hotspot';

// ── Env setup ──────────────────────────────────────────────────────────────
process.env.JAVA_HOME       = JDK_PATH;
process.env.ANDROID_SDK_ROOT = SDK_ROOT;
process.env.ANDROID_HOME    = SDK_ROOT;
process.env.PATH = [
  path.join(JDK_PATH, 'bin'),
  path.join(SDK_ROOT, 'cmdline-tools', 'latest', 'bin'),
  path.join(SDK_ROOT, 'platform-tools'),
  path.join(SDK_ROOT, 'build-tools', '34.0.0'),
  process.env.PATH,
].join(path.delimiter);

function run(cmd, opts = {}) {
  console.log(`\n▶  ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}

// ── Accept Android licenses non-interactively ──────────────────────────────
function acceptLicenses() {
  const sdkManager = path.join(SDK_ROOT, 'cmdline-tools', 'latest', 'bin', 'sdkmanager.bat');
  if (!fs.existsSync(sdkManager)) {
    console.error('❌  Android cmdline-tools not found at', sdkManager);
    console.error('    Run the download step first (see README).');
    process.exit(1);
  }
  const licensesDir = path.join(SDK_ROOT, 'licenses');
  if (!fs.existsSync(licensesDir)) {
    fs.mkdirSync(licensesDir, { recursive: true });
    // Write pre-accepted license hashes (public, not secret)
    fs.writeFileSync(path.join(licensesDir, 'android-sdk-license'),
      '\n8933bad161af4178b1185d1a37fbf41ea5269c55\nd56f5187479451eabf01fb78af6dfcb131a6481e\n24333f8a63b6825ea9c5514f83c2829b004d1fee\n');
    fs.writeFileSync(path.join(licensesDir, 'android-sdk-preview-license'),
      '\n84831b9409646a918e30573bab4c9c91346d8abd\n');
    console.log('✓  Android licenses accepted');
  }
}

// ── Install required SDK packages ──────────────────────────────────────────
function installSdkPackages() {
  const sdkManager = `"${path.join(SDK_ROOT, 'cmdline-tools', 'latest', 'bin', 'sdkmanager.bat')}"`;
  run(`${sdkManager} --install "platforms;android-34" "build-tools;34.0.0" "platform-tools"`);
}

// ── Init bubblewrap project if needed ─────────────────────────────────────
function initProject() {
  if (fs.existsSync(path.join(APK_DIR, 'build.gradle'))) {
    console.log('✓  Android project already exists — skipping init');
    return;
  }
  fs.mkdirSync(APK_DIR, { recursive: true });
  run(`bubblewrap init --manifest "${MANIFEST}" --directory "${APK_DIR}"`, { cwd: APK_DIR });
}

// ── Build APK ─────────────────────────────────────────────────────────────
function buildApk() {
  run(`bubblewrap build --skipPwaValidation`, { cwd: APK_DIR });
}

// ── Copy output ────────────────────────────────────────────────────────────
function copyApk() {
  const candidates = [
    path.join(APK_DIR, 'app-debug.apk'),
    path.join(APK_DIR, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
    path.join(APK_DIR, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk'),
  ];
  const src = candidates.find(fs.existsSync);
  if (!src) {
    console.error('❌  APK not found. Check build output above.');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const dest = path.join(OUT_DIR, 'financial-tracker.apk');
  fs.copyFileSync(src, dest);
  const mb = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅  APK ready → public/downloads/financial-tracker.apk  (${mb} MB)`);
  console.log('   Download URL: https://financial-tracker-mvp.vercel.app/downloads/financial-tracker.apk\n');
}

// ── Main ──────────────────────────────────────────────────────────────────
console.log('🤖  Building Financial Tracker Android APK...\n');
acceptLicenses();
installSdkPackages();
initProject();
buildApk();
copyApk();
