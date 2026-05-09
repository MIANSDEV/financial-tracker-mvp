'use client';

import { useEffect, useState } from 'react';
import { Download, X, TrendingUp, Share, MoreVertical } from 'lucide-react';

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
const DISMISS_TTL = 14 * 24 * 60 * 60 * 1000; // re-show after 14 days

function isDismissed(): boolean {
  try {
    const val = localStorage.getItem(DISMISSED_KEY);
    if (!val) return false;
    return Date.now() - parseInt(val, 10) < DISMISS_TTL;
  } catch {
    return false;
  }
}

type Mode = 'chrome' | 'ios' | 'android' | null;

function detectPlatform(): { isIOS: boolean; isAndroid: boolean } {
  if (typeof navigator === 'undefined') return { isIOS: false, isAndroid: false };
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && 'ontouchend' in document); // iPad Pro iOS 13+
  const isAndroid = /Android/.test(ua);
  return { isIOS, isAndroid };
}

export function PWAInstallPrompt() {
  const [mode, setMode] = useState<Mode>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone || isDismissed()) return;

    const { isIOS, isAndroid } = detectPlatform();

    if (isIOS) {
      setMode('ios');
      return;
    }

    // Use event captured before React hydrated (see layout.tsx <Script>)
    const pre = window.__pwaPrompt;
    if (pre) {
      setDeferredPrompt(pre);
      setMode('chrome');
      return;
    }

    // Android: show manual instructions immediately; upgrade to native
    // install button if beforeinstallprompt fires later
    if (isAndroid) setMode('android');

    // Listen for native install prompt (Chrome engagement heuristic may
    // delay this event by several visits)
    const handler = (e: Event) => {
      if (isDismissed()) return;
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode('chrome');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setMode(null);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, Date.now().toString()); } catch { /* ignore */ }
    setMode(null);
  };

  if (!mode) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-4">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shrink-0 shadow-sm">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
              Install Financial Tracker
            </p>

            {/* Native install prompt (Chrome/Edge) */}
            {mode === 'chrome' && (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Add to your home screen for fast, offline access.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleInstall}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Install
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </>
            )}

            {/* Android Chrome manual instructions */}
            {mode === 'android' && (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Add to your home screen for fast, offline access.
                </p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    <span>Tap <MoreVertical className="w-3 h-3 inline mx-0.5" /> in the browser top-right</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    <span>Tap <strong>Add to Home screen</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                    <span>Tap <strong>Add</strong> to confirm</span>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1 transition-colors"
                >
                  Dismiss
                </button>
              </>
            )}

            {/* iOS Safari manual instructions */}
            {mode === 'ios' && (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Add to your home screen for fast, offline access.
                </p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    <span>Tap <Share className="w-3 h-3 inline mx-0.5 text-blue-500" /> in the Safari toolbar</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    <span>Tap <strong>Add to Home Screen</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                    <span>Tap <strong>Add</strong> to confirm</span>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1 transition-colors"
                >
                  Dismiss
                </button>
              </>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
