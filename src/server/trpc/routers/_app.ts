import { router } from '../trpc';

// Core Feature Pocket
import { usersRouter, companiesRouter, activityRouter } from '../../../features/core/server/routers';

// Clients Feature Pocket
import { clientsRouter, onboardingRouter, pipelineRouter } from '../../../features/clients/server/routers';

// Events Feature Pocket
import {
  eventsRouter,
  timelineRouter,
  timelineTemplatesRouter,
  hotelsRouter,
  accommodationsRouter,
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

// TODO: Uncomment when feature pockets are implemented
// Tasks Feature Pocket
// import { tasksRouter } from '../../../features/tasks/server/routers';

// Team Feature Pocket (February 2026 - Team Management)
import { teamRouter } from '../../../features/team/server/routers';

// Backup Feature Pocket
import { googleSheetsRouter } from '../../../features/backup/server/routers';

// Engagement Feature Pocket (November 2025 - WeddingFlow-Pro-App-Flows)
import { referralsRouter } from '../../../features/engagement/server/routers';

// Analytics Export (Session 54)
import { analyticsExportRouter } from './analyticsExport';

// Questionnaires Feature Pocket (February 2026)
import { questionnairesRouter } from '../../../features/questionnaires/server/routers';

// Workflows Feature Pocket (February 2026)
import { workflowsRouter } from '../../../features/workflows/server/routers';

// Proposals & Contracts Feature Pocket (February 2026)
import { proposalsRouter, contractsRouter } from '../../../features/proposals/server/routers';

// Portal Feature Pocket (Client Portal - February 2026)
import { portalRouter } from '../../../features/portal/server/routers';

// Chatbot Feature Pocket (AI Command Chatbot - February 2026)
import { chatbotRouter } from '../../../features/chatbot/server';

// Integrations Feature Pocket (December 2025)
import { integrationsRouter } from '../../../features/integrations/server/routers';

// Sequences Feature Pocket (December 2025 - HoneyBook Email Sequences)
// import { sequencesRouter } from '../../../features/sequences/server/routers';

// Booking Feature Pocket (December 2025 - HoneyBook Calendar Booking)
// import { bookingRouter } from '../../../features/booking/server/routers';

/**
 * Application Router
 *
 * This is the main tRPC router using Feature Pocket Architecture (October 2025 standard).
 * All routers are organized by business domain into vertical slices for scalability.
 */
export const appRouter = router({
  clients: clientsRouter,
  messages: messagesRouter,
  users: usersRouter,
  activity: activityRouter,
  guests: guestsRouter,
  hotels: hotelsRouter,
  accommodations: accommodationsRouter,
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
  timelineTemplates: timelineTemplatesRouter,
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
  pipeline: pipelineRouter,
  // TODO: Uncomment when feature pockets are implemented
  // tasks: tasksRouter,
  // backup: backupRouter,
  googleSheets: googleSheetsRouter,
  // dataBackup: dataBackupRouter,
  // gamification: gamificationRouter,
  // invitations: invitationsRouter,
  // widgets: widgetsRouter,
  referrals: referralsRouter,

  // February 2026 - Strategic Features
  team: teamRouter,
  questionnaires: questionnairesRouter,
  workflows: workflowsRouter,
  proposals: proposalsRouter,
  contracts: contractsRouter,

  // Integrations stub
  integrations: integrationsRouter,

  // Client Portal
  portal: portalRouter,

  // AI Command Chatbot (February 2026)
  chatbot: chatbotRouter,
  // TODO: Uncomment when implemented
  // sequences: sequencesRouter,
  // booking: bookingRouter,
});

export type AppRouter = typeof appRouter;
