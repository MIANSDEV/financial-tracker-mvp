'use client';

import { useEffect, useState } from 'react';
import { X, Check, Wifi, Zap, Shield, RefreshCw, Share, Star } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __pwaPrompt: BeforeInstallPromptEvent | null;
  }
}

const DISMISSED_KEY = 'pwa-install-dismissed-at';
const DISMISS_TTL = 14 * 24 * 60 * 60 * 1000;

function isDismissed(): boolean {
  try {
    const val = localStorage.getItem(DISMISSED_KEY);
    if (!val) return false;
    return Date.now() - parseInt(val, 10) < DISMISS_TTL;
  } catch {
    return false;
  }
}

type Mode = 'native' | 'ios' | 'android-manual' | 'desktop-manual' | null;

function detectEnv(): { isIOS: boolean; isAndroid: boolean; isDesktop: boolean } {
  if (typeof navigator === 'undefined') return { isIOS: false, isAndroid: false, isDesktop: true };
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  const isAndroid = /Android/.test(ua);
  const isDesktop = !isIOS && !isAndroid;
  return { isIOS, isAndroid, isDesktop };
}

const FEATURES = [
  { icon: Wifi,       label: 'Works offline — no internet needed' },
  { icon: Zap,        label: 'Lightning fast, no browser bar' },
  { icon: Shield,     label: 'Secure & private' },
  { icon: RefreshCw,  label: 'Always up-to-date automatically' },
];

function AppIcon() {
  const [err, setErr] = useState(false);
  return (
    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
      {!err && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/icons/icon-192x192.png" alt="" className="w-20 h-20 object-cover" onError={() => setErr(true)} />
      )}
    </div>
  );
}

function Stars() {
  return (
    <div className="flex items-center gap-0.5 mt-0.5">
      {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">5.0 · Free</span>
    </div>
  );
}

export function PWAInstallPrompt() {
  const [mode, setMode] = useState<Mode>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [visible, setVisible] = useState(false);

  const openModal = (force = false) => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const { isIOS, isAndroid, isDesktop } = detectEnv();
    const pre = window.__pwaPrompt;

    if (pre) {
      setDeferredPrompt(pre);
      setMode('native');
    } else if (isIOS) {
      setMode('ios');
    } else if (isAndroid) {
      setMode('android-manual');
    } else if (isDesktop) {
      // Desktop without native prompt — show Chrome address-bar instructions
      setMode('desktop-manual');
    }
    setVisible(true);
  };

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const { isIOS } = detectEnv();

    // Auto-show after 1.5s for iOS (no native prompt available)
    if (isIOS && !isDismissed()) {
      setMode('ios');
      setTimeout(() => setVisible(true), 1500);
      return;
    }

    const promptHandler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode('native');
      if (!isDismissed()) setTimeout(() => setVisible(true), 1500);
    };
    window.addEventListener('beforeinstallprompt', promptHandler);

    // Check if prompt was captured pre-hydration
    const pre = window.__pwaPrompt;
    if (pre && !isDismissed()) {
      setDeferredPrompt(pre);
      setMode('native');
      setTimeout(() => setVisible(true), 1500);
    }

    const manualHandler = () => openModal(true);
    window.addEventListener('pwa-show-install', manualHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', promptHandler);
      window.removeEventListener('pwa-show-install', manualHandler);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setInstalling(false);
    if (outcome === 'accepted') close();
    setDeferredPrompt(null);
  };

  const close = () => {
    try { localStorage.setItem(DISMISSED_KEY, Date.now().toString()); } catch { /* */ }
    setVisible(false);
    setTimeout(() => setMode(null), 400);
  };

  if (!mode) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={close}
      />

      {/* Sheet */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-sm sm:w-full transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-full sm:translate-y-8 opacity-0 pointer-events-none'}`}>
        <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
          </div>

          <button onClick={close} className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>

          <div className="px-6 pb-8 pt-4">
            {/* App info */}
            <div className="flex items-start gap-4 mb-5">
              <AppIcon />
              <div className="pt-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Financial Tracker</h2>
                <p className="text-sm text-brand-600 dark:text-brand-400 font-medium mt-0.5">Mians IT Farm</p>
                <Stars />
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              Track income, expenses &amp; partners — works offline, installs in seconds.
            </p>

            {/* Feature list */}
            <div className="space-y-2.5 mb-6">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" strokeWidth={2.5} />
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </div>
              ))}
            </div>

            {/* ── Native prompt (Chrome/Edge on Android + Desktop when prompt fires) ── */}
            {mode === 'native' && (
              <button
                onClick={handleInstall}
                disabled={installing}
                className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-base transition-colors disabled:opacity-60 shadow-md shadow-brand-600/20"
              >
                {installing ? 'Installing…' : 'Install — Free'}
              </button>
            )}

            {/* ── Desktop Chrome — native prompt not yet fired (need HTTPS + engagement) ── */}
            {mode === 'desktop-manual' && (
              <div className="space-y-3">
                <div className="rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 p-4 text-sm text-brand-800 dark:text-brand-200 leading-relaxed">
                  Look for the <strong>install icon</strong> <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">⊕</span> in Chrome&apos;s address bar (top-right) and click it to install instantly.
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                  Only visible on HTTPS · works in Chrome &amp; Edge
                </p>
                <button onClick={close} className="w-full py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Got it
                </button>
              </div>
            )}

            {/* ── Android Chrome manual ── */}
            {mode === 'android-manual' && (
              <Steps
                steps={[
                  <>Tap <strong className="text-gray-900 dark:text-white">⋮</strong> menu in Chrome&apos;s top-right</>,
                  <>Tap <strong className="text-gray-900 dark:text-white">Add to Home screen</strong></>,
                  <>Tap <strong className="text-gray-900 dark:text-white">Add</strong> — done!</>,
                ]}
                onDismiss={close}
              />
            )}

            {/* ── iOS Safari ── */}
            {mode === 'ios' && (
              <Steps
                steps={[
                  <>Tap <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" /> <strong className="text-gray-900 dark:text-white">Share</strong> at the bottom of Safari</>,
                  <>Tap <strong className="text-gray-900 dark:text-white">Add to Home Screen</strong></>,
                  <>Tap <strong className="text-gray-900 dark:text-white">Add</strong> to confirm</>,
                ]}
                onDismiss={close}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Steps({ steps, onDismiss }: { steps: React.ReactNode[]; onDismiss: () => void }) {
  return (
    <>
      <div className="mb-4 space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300 leading-snug">{s}</span>
          </div>
        ))}
      </div>
      <button onClick={onDismiss} className="w-full py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        Maybe later
      </button>
    </>
  );
}
