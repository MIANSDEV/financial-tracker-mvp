'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

export function AppFooter() {
  const [isInstalled, setIsInstalled] = useState(true);
  const [canInstallNative, setCanInstallNative] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    // Show native install button only when Chrome has the prompt ready
    if (window.__pwaPrompt) setCanInstallNative(true);
    const handler = () => setCanInstallNative(true);
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isInstalled) return null;

  const handleInstallApp = () => {
    const prompt = window.__pwaPrompt;
    if (prompt) {
      prompt.prompt();
    } else {
      window.dispatchEvent(new CustomEvent('pwa-show-install'));
    }
  };

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4 shrink-0">
      <p className="text-xs text-gray-400 dark:text-gray-600 hidden sm:block select-none">
        Financial Tracker · Mians IT Farm
      </p>

      <div className="flex items-center gap-2 ml-auto">
        {/* Android APK — direct download */}
        <a
          href="/downloads/financial-tracker.apk"
          download="FinancialTracker.apk"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Download for Android (.apk)</span>
          <span className="sm:hidden">Download APK</span>
        </a>

        {/* Desktop — one-click install (shown when Chrome has the prompt ready) */}
        {canInstallNative && (
          <button
            onClick={handleInstallApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-colors shadow-sm shadow-brand-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Install Desktop App</span>
            <span className="sm:hidden">Install</span>
          </button>
        )}
      </div>
    </footer>
  );
}
