import * as Sentry from '@sentry/nextjs';

/**
 * Track a custom transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string,
  data?: Record<string, string | number | boolean>
): Sentry.Span | undefined {
  return Sentry.startSpan(
    {
      name,
      op,
      attributes: data,
    },
    (span) => span
  );
}

/**
 * Performance monitoring for guest operations
 */
export const GuestPerformance = {
  createGuest: (guestCount: number) =>
    startTransaction('guest.create', 'guest.operation', { guestCount }),

  updateGuest: (guestId: string) =>
    startTransaction('guest.update', 'guest.operation', { guestId }),

  bulkImport: (count: number) =>
    startTransaction('guest.bulk_import', 'guest.operation', { count }),
};

/**
 * Performance monitoring for AI operations
 */
export const AIPerformance = {
  seatingGeneration: (guestCount: number, tableCount: number) =>
    startTransaction('ai.seating_generation', 'ai.operation', {
      guestCount,
      tableCount,
    }),

  budgetSuggestions: (categoryCount: number) =>
    startTransaction('ai.budget_suggestions', 'ai.operation', {
      categoryCount,
    }),

  vendorRecommendations: (location: string) =>
    startTransaction('ai.vendor_recommendations', 'ai.operation', {
      location,
    }),
};

/**
 * Performance monitoring for PDF/Export operations
 */
export const ExportPerformance = {
  pdfGeneration: (type: string, itemCount: number) =>
    startTransaction('export.pdf_generation', 'export.operation', {
      type,
      itemCount,
    }),

  excelExport: (type: string, rowCount: number) =>
    startTransaction('export.excel', 'export.operation', {
      type,
      rowCount,
    }),

  qrGeneration: (count: number) =>
    startTransaction('export.qr_codes', 'export.operation', {
      count,
    }),
};

/**
 * Performance monitoring for check-in operations
 */
export const CheckInPerformance = {
  qrScan: () => startTransaction('checkin.qr_scan', 'checkin.operation'),

  manualCheckIn: (guestId: string) =>
    startTransaction('checkin.manual', 'checkin.operation', { guestId }),

  bulkCheckIn: (count: number) =>
    startTransaction('checkin.bulk', 'checkin.operation', { count }),
};

/**
 * Measure and track page load performance
 */
export function trackPageLoad(pageName: string): void {
  if (typeof window === 'undefined') return;

  // Wait for page to be fully loaded
  if (document.readyState === 'complete') {
    measurePageLoad(pageName);
  } else {
    window.addEventListener('load', () => measurePageLoad(pageName));
  }
}

function measurePageLoad(pageName: string): void {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  if (navigation) {
    const loadTime = navigation.loadEventEnd - navigation.fetchStart;
    const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
    const firstPaint = performance.getEntriesByType('paint').find(
      (entry) => entry.name === 'first-contentful-paint'
    );

    Sentry.startSpan(
      {
        name: `pageload.${pageName}`,
        op: 'pageload',
        attributes: {
          loadTime,
          domContentLoaded,
          firstContentfulPaint: firstPaint?.startTime,
        },
      },
      () => {}
    );
  }
}

/**
 * Track Web Vitals
 */
export function trackWebVitals(metric: {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}): void {
  Sentry.setMeasurement(metric.name, metric.value, 'millisecond');

  if (metric.rating === 'poor') {
    Sentry.addBreadcrumb({
      category: 'web-vitals',
      message: `Poor ${metric.name}`,
      level: 'warning',
      data: {
        value: metric.value,
        rating: metric.rating,
      },
    });
  }
}
