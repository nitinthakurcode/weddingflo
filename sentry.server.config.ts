import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Add context to all events
  beforeSend(event, hint) {
    // Add server-side context
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
    }
    return event;
  },

  integrations: [
    Sentry.extraErrorDataIntegration({
      depth: 5,
    }),
  ],

  // Ignore common noise
  ignoreErrors: [
    'ECONNREFUSED',
    'ETIMEDOUT',
  ],
});
