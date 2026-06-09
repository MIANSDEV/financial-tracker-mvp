'use client';

import { useEffect, useState } from 'react';
import { X, Download, Smartphone, Wifi, Zap, Shield } from 'lucide-react';

const DISMISSED_KEY = 'apk-download-dismissed-at';
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000;

function AppIcon() {
  const [err, setErr] = useState(false);
  return (
    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md overflow-hidden shrink-0">
      {!err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/icons/icon-192x192.png" alt="" className="w-12 h-12 object-cover" onError={() => setErr(true)} />
      ) : (
        <Smartphone className="w-6 h-6 text-white" />
      )}
    </div>
  );
}

export function AppDownloadPrompt() {
  const [visible, setVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only show on Android in browser — not in standalone TWA/PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    if (!/Android/i.test(navigator.userAgent)) return;

    try {
      const val = localStorage.getItem(DISMISSED_KEY);
      if (val && Date.now() - parseInt(val, 10) < DISMISS_TTL) return;
    } catch { /* */ }

    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, Date.now().toString()); } catch { /* */ }
    setVisible(false);
  };

  const handleDownload = () => {
    setDownloading(true);
    const a = document.createElement('a');
    a.href = '/downloads/financial-tracker.apk';
    a.download = 'FinancialTracker.apk';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 3000);
  };

  if (!visible) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={dismiss} />
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl overflow-hidden">
          {/* Drag handle */}
          <div className="flex justify-center pt-3">
            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>

          <button
            onClick={dismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="px-6 pb-8 pt-4">
            {/* App info */}
            <div className="flex items-center gap-4 mb-5">
              <AppIcon />
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Financial Tracker</h2>
                <p className="text-sm text-brand-600 dark:text-brand-400 font-medium mt-0.5">Mians IT Farm</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Free · Android App</p>
              </div>
            </div>

            {/* Feature pills */}
            <div className="flex gap-2 mb-5">
              {([
                { icon: Wifi, label: 'Offline' },
                { icon: Zap, label: 'Fast' },
                { icon: Shield, label: 'Secure' },
              ] as const).map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                  <Icon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
                </div>
              ))}
            </div>

            {/* Install steps */}
            <div className="mb-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2.5">Installation steps:</p>
              <div className="space-y-2">
                {[
                  'Tap "Download APK" below',
                  'Open the downloaded file',
                  'Allow "Install unknown apps" if prompted',
                  'Tap Install — done!',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold text-base transition-colors shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <Download className="w-5 h-5" />
              {downloading ? 'Downloading…' : 'Download APK — Free'}
            </button>

            <button
              onClick={dismiss}
              className="w-full mt-3 py-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
