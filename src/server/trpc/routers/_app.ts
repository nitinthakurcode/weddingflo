import { router } from '../trpc';

// Core Feature Pocket
import { usersRouter, companiesRouter } from '../../../features/core/server/routers';

// Clients Feature Pocket
import { clientsRouter, onboardingRouter, pipelineRouter } from '../../../features/clients/server/routers';

// Events Feature Pocket
import {
  eventsRouter,
  timelineRouter,
  hotelsRouter,
  calendarRouter,
  giftsRouter,
  giftsEnhancedRouter,
  guestGiftsRouter,
  guestTransportRouter,
  giftTypesRouter,
  vendorsRouter,
  floorPlansRouter,
  eventFlowRouter
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
import { analyticsRouter, budgetRouter, internalBudgetRouter, exportRouter, importRouter } from '../../../features/analytics/server/routers';

// Tasks Feature Pocket
import { tasksRouter } from '../../../features/tasks/server/routers';

// Team Feature Pocket (November 2025 - Team Management)
import { teamRouter } from '../../../features/team/server/routers';

// Backup Feature Pocket
import { backupRouter, googleSheetsRouter, dataBackupRouter } from '../../../features/backup/server/routers';

// Engagement Feature Pocket (November 2025 - WeddingFlow-Pro-App-Flows)
import {
  gamificationRouter,
  invitationsRouter,
  activityRouter,
  widgetsRouter,
  referralsRouter
} from '../../../features/engagement/server/routers';

// Analytics Export (Session 54)
import { analyticsExportRouter } from './analyticsExport';

// Questionnaires Feature Pocket (December 2025)
import { questionnairesRouter } from '../../../features/questionnaires/server/routers';

// Workflows Feature Pocket (December 2025)
import { workflowsRouter } from '../../../features/workflows/server/routers';

// Proposals Feature Pocket (December 2025)
import { proposalsRouter, smartFilesRouter } from '../../../features/proposals/server/routers';

// Integrations Feature Pocket (December 2025)
import { integrationsRouter } from '../../../features/integrations/server/routers/integrations.router';

// Sequences Feature Pocket (December 2025 - HoneyBook Email Sequences)
import { sequencesRouter } from '../../../features/sequences/server/routers';

// Booking Feature Pocket (December 2025 - HoneyBook Calendar Booking)
import { bookingRouter } from '../../../features/booking/server/routers';

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
  guestGifts: guestGiftsRouter,
  guestTransport: guestTransportRouter,
  giftTypes: giftTypesRouter,
  vendors: vendorsRouter,
  budget: budgetRouter,
  internalBudget: internalBudgetRouter,
  events: eventsRouter,
  timeline: timelineRouter,
  floorPlans: floorPlansRouter,
  eventFlow: eventFlowRouter,
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
  tasks: tasksRouter,
  backup: backupRouter,
  googleSheets: googleSheetsRouter,
  dataBackup: dataBackupRouter,
  // Engagement Feature Pocket (November 2025)
  gamification: gamificationRouter,
  invitations: invitationsRouter,
  activity: activityRouter,
  widgets: widgetsRouter,
  referrals: referralsRouter,
  // Team Feature Pocket (November 2025 - Team Management)
  team: teamRouter,
  // Questionnaires Feature Pocket (December 2025)
  questionnaires: questionnairesRouter,
  // Workflows Feature Pocket (December 2025)
  workflows: workflowsRouter,
  // Proposals Feature Pocket (December 2025)
  proposals: proposalsRouter,
  // Smart Files Feature (December 2025 - HoneyBook Unified View)
  smartFiles: smartFilesRouter,
  // Integrations Feature Pocket (December 2025)
  integrations: integrationsRouter,
  // Pipeline Feature (December 2025 - HoneyBook CRM)
  pipeline: pipelineRouter,
  // Sequences Feature (December 2025 - HoneyBook Email Sequences)
  sequences: sequencesRouter,
  // Booking Feature (December 2025 - HoneyBook Calendar Booking)
  booking: bookingRouter,
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
