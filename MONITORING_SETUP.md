# Production Monitoring & Analytics Setup

This document describes the complete monitoring and analytics setup for WeddingFlow Pro.

## 🎯 Overview

The application now has comprehensive production monitoring with:
- **Sentry** for error tracking and performance monitoring
- **PostHog** for product analytics and feature flags
- **Vercel Analytics** for web vitals and performance metrics
- **Structured Logging** for debugging and auditing

---

## 📊 1. Sentry Error Tracking

### Configuration Files
- `sentry.client.config.ts` - Client-side error tracking
- `sentry.server.config.ts` - Server-side error tracking
- `sentry.edge.config.ts` - Edge runtime error tracking
- `instrumentation.ts` - Automatic instrumentation

### Features Implemented
✅ Automatic error capture on client and server
✅ Session replay for debugging user issues
✅ Performance monitoring with custom transactions
✅ Source maps upload for production debugging
✅ Error filtering and deduplication
✅ User context tracking
✅ Breadcrumbs for user actions

### Key Files
- `src/lib/errors/sentry-logger.ts` - Error logging utilities
- `src/lib/errors/error-boundary.tsx` - React Error Boundary
- `src/lib/monitoring/performance.ts` - Performance tracking

### Usage Example
```typescript
import { captureError, captureApiError } from '@/lib/errors/sentry-logger';

// Capture an error with context
captureError(new Error('Something went wrong'), {
  userId: user.id,
  component: 'GuestForm',
  action: 'create_guest',
});

// Capture API errors
captureApiError(error, '/api/guests', 'POST', 500);
```

### Performance Tracking
```typescript
import { AIPerformance } from '@/lib/monitoring/performance';

// Track AI operations
const span = AIPerformance.seatingGeneration(guestCount, tableCount);
// ... perform operation
span?.end();
```

---

## 📈 2. PostHog Analytics

### Configuration
- `src/lib/analytics/posthog-client.ts` - PostHog initialization
- `src/app/providers/analytics-provider.tsx` - Analytics provider

### Features Implemented
✅ Automatic page view tracking
✅ User identification with Clerk
✅ Custom event tracking
✅ Session recording
✅ Feature flags
✅ Group analytics (company-level)
✅ Funnel analysis ready

### Event Tracking
All key events are tracked via `src/lib/analytics/events.ts`:

**User Events:**
- `user_signed_up`
- `user_logged_in`

**Guest Events:**
- `guest_created`, `guest_updated`, `guest_deleted`
- `guests_imported`, `guests_exported`

**Vendor Events:**
- `vendor_added`, `vendor_updated`, `vendor_deleted`
- `vendor_contacted`

**Budget Events:**
- `budget_item_created`, `budget_item_updated`, `budget_item_paid`
- `budget_exceeded`

**AI Events:**
- `ai_seating_generated`
- `ai_budget_suggested`
- `ai_vendor_recommended`

**Export Events:**
- `pdf_generated`, `excel_exported`

**Payment Events:**
- `payment_initiated`, `payment_completed`, `payment_failed`
- `subscription_upgraded`, `subscription_downgraded`

**Check-in Events:**
- `guest_checked_in_manual`, `guest_checked_in_qr`

### Usage Example
```typescript
import { GuestEvents } from '@/lib/analytics/events';

// Track guest creation
GuestEvents.created(guest.id, totalGuestCount);

// Track AI usage
AIEvents.seatingGenerated(guestCount, tableCount, duration, success);
```

### User Properties
```typescript
import { identifyUser, setCompanyProperties } from '@/lib/analytics/user-properties';

// Identify user
identifyUser({
  userId: user.id,
  email: user.email,
  role: 'owner',
  plan: 'professional',
});

// Set company properties
setCompanyProperties({
  companyId: company.id,
  plan: 'professional',
  userCount: 5,
  guestCount: 250,
});
```

---

## 🚀 3. Feature Flags

### Configuration
- `src/lib/analytics/feature-flags.ts` - Feature flag utilities
- `src/components/analytics/feature-flag-wrapper.tsx` - React components

### Available Flags
```typescript
// AI Features
AI_SEATING: 'ai-seating-enabled'
AI_BUDGET: 'ai-budget-suggestions'
AI_VENDOR_RECOMMENDATIONS: 'ai-vendor-recommendations'

// New Features
ADVANCED_REPORTING: 'advanced-reporting'
CUSTOM_BRANDING: 'custom-branding'
MULTI_EVENT: 'multi-event-support'

// Beta Features
MOBILE_APP: 'mobile-app-beta'
VIDEO_MESSAGES: 'video-messages-beta'

// System Controls
MAINTENANCE_MODE: 'maintenance-mode'
```

### Usage Example
```typescript
import { useFeatureFlag } from '@/components/analytics/feature-flag-wrapper';
import { FeatureFlags } from '@/lib/analytics/feature-flags';

function MyComponent() {
  const aiEnabled = useFeatureFlag(FeatureFlags.AI_SEATING);

  return aiEnabled ? <AIFeature /> : <ManualFeature />;
}
```

Or with the wrapper:
```tsx
<FeatureFlagWrapper flag={FeatureFlags.AI_SEATING}>
  <AISeatingFeature />
</FeatureFlagWrapper>
```

---

## ⚡ 4. Vercel Analytics

### Setup
Vercel Analytics and Speed Insights are automatically included in the root layout:
- `<Analytics />` - Web Vitals and custom events
- `<SpeedInsights />` - Real User Monitoring (RUM)

### Metrics Tracked
- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay)
- **CLS** (Cumulative Layout Shift)
- **TTFB** (Time to First Byte)
- **FCP** (First Contentful Paint)

---

## 📝 5. Structured Logging

### Configuration
- `src/lib/logger.ts` - Logging system

### Log Levels
- `debug` - Development debugging
- `info` - General information
- `warn` - Warnings
- `error` - Errors and exceptions

### Usage Example
```typescript
import { logger, logMutation, logApiRequest } from '@/lib/logger';

// General logging
logger.info('Guest created successfully', {
  userId: user.id,
  component: 'GuestForm',
  metadata: { guestId: guest.id },
});

// Log mutations
logMutation('createGuest', { name: 'John Doe' });

// Log API requests
logApiRequest('/api/guests', 'POST', 200);
```

---

## 🎨 6. Custom Analytics Dashboard

### Location
`/admin/analytics` - Internal analytics dashboard

### Features
- Daily/Monthly Active Users (DAU/MAU)
- Active subscriptions
- Error rates
- Feature usage statistics
- Performance metrics
- PostHog dashboard embedding

---

## ✅ Verification Steps

### 1. Test Sentry Error Tracking
```typescript
// Add this to any page temporarily
import { captureError } from '@/lib/errors/sentry-logger';

function TestButton() {
  return (
    <button onClick={() => captureError(new Error('Test error'))}>
      Send Test Error to Sentry
    </button>
  );
}
```

Then:
1. Click the button
2. Go to https://sentry.io/organizations/your-org/issues/
3. Verify the error appears

### 2. Test PostHog Events
```typescript
import { GuestEvents } from '@/lib/analytics/events';

// Trigger an event
GuestEvents.created('test-guest-id', 100);
```

Then:
1. Go to https://app.posthog.com
2. Navigate to Events
3. Verify your event appears

### 3. Test Feature Flags
1. Go to PostHog → Feature Flags
2. Create a flag named `ai-seating-enabled`
3. Use the `useFeatureFlag` hook in your component
4. Toggle the flag and verify behavior changes

### 4. Test Vercel Analytics
1. Deploy to Vercel
2. Visit your site and navigate around
3. Go to Vercel Dashboard → Analytics
4. Verify page views and web vitals appear

### 5. Test Performance Monitoring
```typescript
import { startTransaction } from '@/lib/monitoring/performance';

const transaction = startTransaction('test-operation', 'custom');
// ... do work
transaction?.end();
```

Check Sentry → Performance for the transaction.

---

## 🔧 Environment Variables Required

All variables are already in `.env.local`:

```bash
# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=sntryu_...

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

For production deployment, add these to Vercel:
```bash
vercel env add NEXT_PUBLIC_SENTRY_DSN
vercel env add SENTRY_AUTH_TOKEN
vercel env add NEXT_PUBLIC_POSTHOG_KEY
vercel env add NEXT_PUBLIC_POSTHOG_HOST
```

---

## 📦 Production Deployment

### Source Maps Upload
Source maps are automatically uploaded to Sentry during production builds via `next.config.ts`.

### Build Command
```bash
npm run build
```

This will:
1. Build the Next.js application
2. Upload source maps to Sentry
3. Generate optimized bundles

---

## 🎯 Best Practices

1. **Always add context to errors:**
   ```typescript
   captureError(error, {
     userId: user.id,
     component: 'GuestForm',
     action: 'create',
   });
   ```

2. **Track important user actions:**
   ```typescript
   GuestEvents.created(guestId, totalGuests);
   ```

3. **Use feature flags for risky changes:**
   ```typescript
   const isEnabled = useFeatureFlag(FeatureFlags.NEW_FEATURE);
   ```

4. **Log mutations and API calls:**
   ```typescript
   logMutation('createGuest', args);
   logApiRequest(endpoint, method, statusCode);
   ```

5. **Track milestones:**
   ```typescript
   import { trackCompanyMilestone, Milestones } from '@/lib/analytics/user-properties';

   trackCompanyMilestone(Milestones.GUESTS_100, companyId);
   ```

---

## 📊 Dashboard Links

- **Sentry:** https://sentry.io/organizations/your-org/
- **PostHog:** https://app.posthog.com
- **Vercel Analytics:** https://vercel.com/dashboard/analytics
- **Internal Dashboard:** /admin/analytics

---

## 🆘 Troubleshooting

### Sentry not capturing errors
- Check `NEXT_PUBLIC_SENTRY_DSN` is set
- Verify Sentry is initialized (check browser console)
- Ensure `NODE_ENV=production` for full functionality

### PostHog events not appearing
- Check `NEXT_PUBLIC_POSTHOG_KEY` is set
- PostHog auto-disables in development
- Wait 5-10 seconds for events to process

### Feature flags not working
- Ensure user is identified: `posthog.identify(userId)`
- Check flag exists in PostHog dashboard
- Call `reloadFeatureFlags()` if needed

### Source maps not uploading
- Verify `SENTRY_AUTH_TOKEN` is set
- Check build logs for upload errors
- Ensure `@sentry/nextjs` is properly configured

---

## 📚 Additional Resources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [PostHog Next.js Documentation](https://posthog.com/docs/libraries/next-js)
- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)

---

**Setup completed successfully! 🎉**
All monitoring and analytics systems are now configured and ready for production use.
