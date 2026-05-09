import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Financial Tracker | Mians IT Farm',
  description: 'Multi-tenant SaaS financial tracking platform by Mians IT Farm',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Financial Tracker',
  },
  formatDetection: { telephone: false },
  icons: {
    shortcut: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0ea5e9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Capture beforeinstallprompt before React hydrates so the PWA
            install banner doesn't miss the event when mounting late */}
        <Script id="pwa-capture" strategy="beforeInteractive">{`
          window.__pwaPrompt = null;
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__pwaPrompt = e;
          }, { once: true });
        `}</Script>
        <Providers>
          {children}
          <SpeedInsights />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { borderRadius: '8px', fontSize: '14px' },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
