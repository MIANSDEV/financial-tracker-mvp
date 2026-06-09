/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline',
  },
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'static-image-assets', expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 } },
    },
    {
      urlPattern: /\/_next\/static.+\.js$/i,
      handler: 'CacheFirst',
      options: { cacheName: 'next-static-js-assets', expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 } },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'next-image', expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 } },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'static-js-assets', expiration: { maxEntries: 48, maxAgeSeconds: 24 * 60 * 60 } },
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'static-style-assets', expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 } },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'next-data', expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 } },
    },
    {
      urlPattern: ({ url }) => {
        if (typeof self === 'undefined') return false;
        const isSameOrigin = self.origin === url.origin;
        if (!isSameOrigin) return false;
        return !url.pathname.startsWith('/api/');
      },
      handler: 'NetworkFirst',
      options: { cacheName: 'others', expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }, networkTimeoutSeconds: 10 },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['firebase-admin'],
  // Turbopack (Next.js 16 default) – empty config silences webpack-fallback warning
  turbopack: {},
};

module.exports = withPWA(nextConfig);
