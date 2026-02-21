import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import withPWA from '@ducanh2912/next-pwa';
import { withSentryConfig } from '@sentry/nextjs';
// @ts-ignore - @next/bundle-analyzer doesn't have types
import withBundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const withBundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withPWAConfig = withPWA({
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Note: swcMinify is now default in Next.js 15+ (removed deprecated option)

  // Enable standalone output for Docker deployment
  output: 'standalone',

  webpack: (config, { isServer }) => {
    // Client-side fallbacks for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        path: false,
      };

      // Block OpenTelemetry from client bundles (prevents ChunkLoadError)
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@opentelemetry/api': false,
        '@opentelemetry/instrumentation': false,
        '@sentry/opentelemetry': false,
      };
    }

    // Handle canvas module for Konva (used for floor plans)
    // Canvas is only needed for Node.js server-side rendering which we don't use
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas'];
    }

    return config;
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google profile images
    ],
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Experimental features for performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Server Actions CSRF protection - Security February 2026
    serverActions: {
      allowedOrigins: [
        'weddingflow.pro',
        '*.weddingflow.pro',
        'localhost:3000',
      ],
    },
  },

  typescript: {
    ignoreBuildErrors: false,
  },
  // Note: ESLint configuration moved to eslint.config.mjs (Next.js 16+ requirement)
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
            value: 'max-age=63072000; includeSubDomains; preload'
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
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://js.stripe.com https://*.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.stripe.com https://api.openai.com https://*.sentry.io",
              "frame-src 'self' https://challenges.cloudflare.com https://js.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join('; ')
          }
        ],
      },
      // API routes - no cache
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      // Static assets - long cache
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Allow cross-origin requests from network IP (for mobile testing)
  allowedDevOrigins: [
    'http://192.168.29.127:3000',
    'http://192.168.29.93:3000',
    'http://localhost:3000',
  ],
};

// Sentry configuration
const sentryConfig = withSentryConfig(
  nextConfig,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,

    // Only upload source maps in production builds
    silent: !process.env.CI,

    // Upload source maps during production build
    widenClientFileUpload: true,

    // Webpack-specific configuration (new format for Sentry 10.30+)
    webpack: {
      // Automatically annotate React components to show their full name in breadcrumbs and session replay
      // Disabled for Next.js 15+ compatibility - can cause issues with Server/Client Component separation
      reactComponentAnnotation: {
        enabled: false,
      },
      // Tree-shake configuration
      treeshake: {
        // Automatically tree-shake Sentry logger statements to reduce bundle size
        removeDebugLogging: true,
      },
    },
  }
);

export default withBundleAnalyzerConfig(withNextIntl(withPWAConfig(sentryConfig)));
