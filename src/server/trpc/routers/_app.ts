import { router } from '../trpc';

// Core Feature Pocket
import { usersRouter, companiesRouter } from '../../../features/core/server/routers';

// Clients Feature Pocket
import { clientsRouter, onboardingRouter } from '../../../features/clients/server/routers';

// Events Feature Pocket
import {
  eventsRouter,
  timelineRouter,
  hotelsRouter,
  calendarRouter,
  giftsRouter,
  giftsEnhancedRouter,
  vendorsRouter,
  floorPlansRouter
} from '../../../features/events/server/routers';

// Guests Feature Pocket
import { guestsRouter, qrRouter, messagesRouter, websitesRouter } from '../../../features/guests/server/routers';

// Communications Feature Pocket
import {
  emailRouter,
  smsRouter,
  whatsappRouter,
  pushRouter,
  aiRouter
} from '../../../features/communications/server/routers';

// Payments Feature Pocket
import { paymentRouter, stripeRouter, pdfRouter } from '../../../features/payments/server/routers';

// Media Feature Pocket
import { documentsRouter, storageRouter, creativesRouter } from '../../../features/media/server/routers';

// Analytics Feature Pocket
import { analyticsRouter, budgetRouter, exportRouter, importRouter } from '../../../features/analytics/server/routers';

// Analytics Export (Session 54)
import { analyticsExportRouter } from './analyticsExport';

/**
 * Application Router
 *
 * This is the main tRPC router using Feature Pocket Architecture (October 2025 standard).
 * All routers are organized by business domain into vertical slices for scalability.
 *
 * ## Feature Pockets:
 * - core: User/company identity & tenant management
 * - clients: Client relationship management
 * - events: Event planning & logistics
 * - guests: Guest management & check-in
 * - communications: Multi-channel notifications (email, SMS, WhatsApp, push, AI)
 * - payments: Payment processing & invoicing
 * - media: File & asset management
 * - analytics: Business intelligence & reporting
 *
 * ## Adding New Routers:
 * 1. Create router in appropriate feature pocket: `src/features/{pocket}/server/routers/{name}.router.ts`
 * 2. Export from pocket index: `src/features/{pocket}/server/routers/index.ts`
 * 3. Import and merge here using feature pocket path
 *
 * @example
 * ```ts
 * // Import from feature pocket
 * import { newRouter } from '../../../features/clients/server/routers';
 *
 * // Merge into app router
 * export const appRouter = router({
 *   ...existing,
 *   newFeature: newRouter,
 * });
 * ```
 */
export const appRouter = router({
  clients: clientsRouter,
  messages: messagesRouter,
  users: usersRouter,
  guests: guestsRouter,
  hotels: hotelsRouter,
  gifts: giftsRouter,
  giftsEnhanced: giftsEnhancedRouter,
  vendors: vendorsRouter,
  budget: budgetRouter,
  events: eventsRouter,
  timeline: timelineRouter,
  floorPlans: floorPlansRouter,
  documents: documentsRouter,
  creatives: creativesRouter,
  ai: aiRouter,
  qr: qrRouter,
  analytics: analyticsRouter,
  analyticsExport: analyticsExportRouter,
  export: exportRouter,
  import: importRouter,
  stripe: stripeRouter,
  onboarding: onboardingRouter,
  companies: companiesRouter,
  email: emailRouter,
  sms: smsRouter,
  whatsapp: whatsappRouter,
  payment: paymentRouter,
  pdf: pdfRouter,
  calendar: calendarRouter,
  push: pushRouter,
  storage: storageRouter,
  websites: websitesRouter,
});

/**
 * Type definition for the app router.
 * This type enables end-to-end type safety from server to client.
 *
 * @example
 * ```ts
 * import type { AppRouter } from '@/server/trpc/routers/_app';
 *
 * const trpc = createTRPCReact<AppRouter>();
 * ```
 */
export type AppRouter = typeof appRouter;
