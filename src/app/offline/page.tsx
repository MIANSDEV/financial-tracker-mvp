'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { TrendingUp } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg mb-6">
        <TrendingUp className="w-8 h-8 text-white" />
      </div>

      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <WifiOff className="w-7 h-7 text-gray-400" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">You&apos;re offline</h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8 text-sm leading-relaxed">
        No internet connection detected. Check your network and try again. Pages you&apos;ve already visited are still available.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try again
      </button>
    </div>
  );
}
