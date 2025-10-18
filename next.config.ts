import type { NextConfig } from 'next';
// import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Fix for originalFactory.call error with Clerk
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      // Block OpenTelemetry from client bundles (prevents ChunkLoadError)
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@opentelemetry/api': false,
        '@opentelemetry/instrumentation': false,
        '@sentry/opentelemetry': false,
      };
    }
    return config;
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // PWA Configuration & Security Headers
  headers: async () => {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
      // Security headers for all routes
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ];
  },
  // Allow cross-origin requests from network IP (for mobile testing)
  allowedDevOrigins: [
    'http://192.168.29.93:3000',
    'http://localhost:3000',
  ],
};

// Sentry configuration - temporarily disabled to fix Next.js 15 Fast Refresh issue
// export default withSentryConfig(nextConfig, {
//   // For all available options, see:
//   // https://github.com/getsentry/sentry-webpack-plugin#options

//   org: process.env.SENTRY_ORG,
//   project: process.env.SENTRY_PROJECT,
//   authToken: process.env.SENTRY_AUTH_TOKEN,

//   // Only upload source maps in production builds
//   silent: !process.env.CI,

//   // Upload source maps during production build
//   widenClientFileUpload: true,

//   // Automatically annotate React components to show their full name in breadcrumbs and session replay
//   // Disabled for Next.js 15 compatibility - can cause issues with Server/Client Component separation
//   reactComponentAnnotation: {
//     enabled: false,
//   },

//   // Hides source maps from generated client bundles
//   hideSourceMaps: true,

//   // Automatically tree-shake Sentry logger statements to reduce bundle size
//   disableLogger: true,
// });

export default nextConfig;
