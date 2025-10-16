import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window === 'undefined') return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!apiKey || !apiHost) {
    console.warn('[PostHog] Missing API key or host');
    return;
  }

  if (!posthog.__loaded) {
    posthog.init(apiKey, {
      api_host: apiHost,
      person_profiles: 'identified_only',

      // Capture pageviews automatically
      capture_pageview: true,
      capture_pageleave: true,

      // Session recording
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-private]',
      },

      // Autocapture
      autocapture: {
        dom_event_allowlist: ['click', 'submit', 'change'],
        css_selector_allowlist: ['[ph-autocapture]'],
      },

      // Disable in development
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.opt_out_capturing();
          console.log('[PostHog] Opted out in development');
        }
      },

      // Feature flags
      bootstrap: {
        featureFlags: {},
      },
    });
  }

  return posthog;
}

export { posthog };
