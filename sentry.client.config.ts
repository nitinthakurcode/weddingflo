import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Add context to all events
  beforeSend(event, hint) {
    // Filter out localhost errors in development
    if (event.request?.url?.includes('localhost') && process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Track navigation timing
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/.*\.vercel\.app/,
    /^https:\/\/.*\.convex\.cloud/,
  ],

  // Ignore common noise
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'ChunkLoadError',
    'Loading chunk',
  ],
});
