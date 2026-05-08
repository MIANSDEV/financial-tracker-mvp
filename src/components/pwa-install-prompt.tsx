'use client';

import { useEffect, useState } from 'react';
import { Download, X, TrendingUp, Share, ArrowUp } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa-install-dismissed';

type Mode = 'chrome' | 'ios' | null;

function detectMode(): Mode {
  if (typeof window === 'undefined') return null;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true;

  if (isStandalone) return null;
  if (localStorage.getItem(DISMISSED_KEY)) return null;

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  // iOS Safari: has no beforeinstallprompt, show manual instructions
  if (isIOS) return 'ios';

  // Chrome/Edge: wait for beforeinstallprompt event
  return null;
}

export function PWAInstallPrompt() {
  const [mode, setMode] = useState<Mode>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const initialMode = detectMode();
    if (initialMode === 'ios') {
      setMode('ios');
    }

    const handler = (e: Event) => {
      if (localStorage.getItem(DISMISSED_KEY)) return;
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
    localStorage.setItem(DISMISSED_KEY, '1');
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

            {mode === 'chrome' ? (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Add to your home screen for offline access and a native app experience.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleInstall}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Install app
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Add to your home screen for offline access.
                </p>
                {/* iOS step-by-step */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    <span>Tap the <Share className="w-3 h-3 inline mx-0.5 text-blue-500" /> Share button below</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    <span>Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                    <span>Tap <strong>&ldquo;Add&rdquo;</strong> to confirm</span>
                  </div>
                </div>
                {/* Arrow pointing down toward Safari toolbar */}
                <div className="flex items-center justify-center mt-3 text-brand-600 dark:text-brand-400 animate-bounce">
                  <ArrowUp className="w-4 h-4 rotate-180" />
                  <span className="text-xs ml-1 font-medium">Safari toolbar</span>
                </div>
                <button
                  onClick={handleDismiss}
                  className="mt-2 w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1 transition-colors"
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
