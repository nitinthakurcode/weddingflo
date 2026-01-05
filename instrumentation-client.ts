// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Export hook for router transition tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Disable Sentry in development to avoid rate limiting
  enabled: process.env.NODE_ENV === 'production',

  // Define how likely traces are sampled. Adjust this value in production,
  // or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 1 : 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Enable replay for all environments during setup, adjust for production
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  // Integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.feedbackIntegration({
      colorScheme: 'system',
      isNameRequired: true,
      isEmailRequired: true,
      autoInject: false, // Don't show floating button - access via Help menu instead
    }),
  ],

  // Environment configuration
  environment: process.env.NODE_ENV,

  // Filter out specific errors
  ignoreErrors: [
    // Random plugins/extensions
    'top.GLOBALS',
    // See: http://blog.errorception.com/2012/03/tale-of-unfindable-js-error.html
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    'http://tt.telecomregionu',
    'jigsaw is not defined',
    'ComboSearch is not defined',
    'http://loading.retry.widdit.com/',
    'atomicFindClose',
    // Facebook borance
    'fb_xd_fragment',
    // ISP "optimizations"
    'bmi_telecominfofr',
    // Avast extension
    '_telecominfous__telecominfous',
    // Network errors
    'Network Error',
    'Failed to fetch',
    'Load failed',
    // Chunk/module loading errors (stale cache after deployment)
    'ChunkLoadError',
    'Loading chunk',
    'Cannot find module',
    'Failed to fetch dynamically imported module',
    /Loading chunk \d+ failed/,
    /Cannot find module '\.\//,
    // IndexedDB errors (handled gracefully in app)
    'InvalidStateError',
    'database connection is closing',
    // User-triggered
    'ResizeObserver loop',
  ],

  // Limit breadcrumbs
  maxBreadcrumbs: 50,

  // Before send hook to filter/modify events
  beforeSend(event, hint) {
    // Filter out events from browser extensions
    if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
      frame => frame.filename?.includes('extension')
    )) {
      return null;
    }
    return event;
  },
});
