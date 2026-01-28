import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

// Supported locales
const locales = ['en', 'pt'];
const defaultLocale = 'en';

const nextConfig: NextConfig = {
  compress: true,
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-slot'],
  },
  images: {
    unoptimized: true,
  },
  // Empty turbopack config to avoid webpack conflict
  turbopack: {},
  // Handle locale redirects with rewrites (preferred over middleware for reverse proxies)
  async rewrites() {
    return {
      beforeFiles: [
        // Rewrite root / to /en (default locale)
        {
          source: '/',
          destination: `/${defaultLocale}`,
        },
        // Rewrite paths without locale to include locale prefix
        {
          source: '/:path((?!(?:api|_next|_static|[\\w-]+\\.\\w+)).*)',
          destination: `/${defaultLocale}/:path`,
        },
      ],
    };
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.googleusercontent.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://accounts.google.com https://*.googleusercontent.com",
              "frame-src 'self' https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
