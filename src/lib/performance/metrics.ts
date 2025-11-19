import { Metric } from 'web-vitals';

export function reportWebVitals(metric: Metric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vitals:', metric);
  }

  // Send to analytics in production
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Send to PostHog
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('web_vital', {
      metric_name: metric.name,
      value: metric.value,
      id: metric.id,
    });
  }

  // Send to Sentry for performance monitoring
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.captureMessage(`Web Vital: ${metric.name}`, {
      level: 'info',
      tags: {
        metric: metric.name,
      },
      extra: {
        value: metric.value,
        id: metric.id,
      },
    });
  }
}
