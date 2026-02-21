/**
 * Drizzle ORM Relations
 *
 * February 2026 - Type-safe relations for .query() builder
 *
 * This file defines all table relationships for Drizzle ORM,
 * enabling type-safe queries with automatic joins.
 *
 * Usage:
 *   const clientsWithGuests = await db.query.clients.findMany({
 *     with: { guests: true, events: true }
 *   });
 */

import { relations } from 'drizzle-orm';
import {
  user,
  session,
  account,
} from './schema';
import {
  users,
  companies,
  clients,
  clientUsers,
  guests,
  events,
  timeline,
  vendors,
  clientVendors,
  budget,
  activity,
  hotels,
  guestTransport,
  vehicles,
  timelineTemplates,
  documents,
  floorPlans,
  floorPlanTables,
  floorPlanGuests,
  gifts,
  giftsEnhanced,
  messages,
  payments,
  refunds,
  weddingWebsites,
  notifications,
  accommodations,
  vendorComments,
  vendorReviews,
  advancePayments,
  guestGifts,
  giftCategories,
  giftTypes,
  thankYouNoteTemplates,
  emailLogs,
  emailPreferences,
  smsLogs,
  smsTemplates,
  smsPreferences,
  whatsappLogs,
  whatsappTemplates,
  pushLogs,
  pushSubscriptions,
  pushNotificationLogs,
  pushNotificationPreferences,
  stripeAccounts,
  stripeConnectAccounts,
  websiteBuilderLayouts,
  websiteBuilderPages,
  websiteBuilderContent,
  invoices,
  scheduledReports,
  generatedReports,
  calendarSyncSettings,
  calendarSyncedEvents,
  googleCalendarTokens,
  icalFeedTokens,
  creativeJobs,
  qrCodes,
  hotelBookings,
  guestPreferences,
  guestConflicts,
  seatingChangeLog,
  seatingVersions,
  teamClientAssignments,
} from './schema-features';
import {
  pipelineStages,
  pipelineLeads,
  pipelineActivities,
} from './schema-pipeline';
import {
  chatbotConversations,
  chatbotMessages,
  chatbotCommandTemplates,
  chatbotPendingCalls,
} from './schema-chatbot';
import {
  proposalTemplates,
  proposals,
  contractTemplates,
  contracts,
} from './schema-proposals';
import {
  workflows,
  workflowSteps,
  workflowExecutions,
  workflowExecutionLogs,
} from './schema-workflows';
import {
  questionnaireTemplates,
  questionnaires,
  questionnaireResponses,
} from './schema-questionnaires';
import {
  teamInvitations,
  weddingInvitations,
} from './schema-invitations';

// ============================================
// CORE AUTH RELATIONS
// ============================================

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  chatbotConversations: many(chatbotConversations),
  chatbotCommandTemplates: many(chatbotCommandTemplates),
  activities: many(activity),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// ============================================
// COMPANY RELATIONS
// ============================================

export const companiesRelations = relations(companies, ({ many }) => ({
  clients: many(clients),
  vendors: many(vendors),
  pipelineStages: many(pipelineStages),
  pipelineLeads: many(pipelineLeads),
  timelineTemplates: many(timelineTemplates),
}));

// ============================================
// CLIENT RELATIONS
// ============================================

export const clientsRelations = relations(clients, ({ many }) => ({
  guests: many(guests),
  events: many(events),
  timeline: many(timeline),
  budget: many(budget),
  clientUsers: many(clientUsers),
  clientVendors: many(clientVendors),
  hotels: many(hotels),
  guestTransport: many(guestTransport),
  vehicles: many(vehicles),
  chatbotConversations: many(chatbotConversations),
}));

export const clientUsersRelations = relations(clientUsers, ({ one }) => ({
  client: one(clients, {
    fields: [clientUsers.clientId],
    references: [clients.id],
  }),
}));

// ============================================
// GUEST RELATIONS
// ============================================

export const guestsRelations = relations(guests, ({ one, many }) => ({
  client: one(clients, {
    fields: [guests.clientId],
    references: [clients.id],
  }),
  hotels: many(hotels),
  transport: many(guestTransport),
}));

// ============================================
// EVENT RELATIONS
// ============================================

export const eventsRelations = relations(events, ({ one, many }) => ({
  client: one(clients, {
    fields: [events.clientId],
    references: [clients.id],
  }),
  timeline: many(timeline),
  clientVendors: many(clientVendors),
}));

// ============================================
// TIMELINE RELATIONS
// ============================================

export const timelineRelations = relations(timeline, ({ one }) => ({
  client: one(clients, {
    fields: [timeline.clientId],
    references: [clients.id],
  }),
  event: one(events, {
    fields: [timeline.eventId],
    references: [events.id],
  }),
}));

export const timelineTemplatesRelations = relations(timelineTemplates, ({ one }) => ({
  company: one(companies, {
    fields: [timelineTemplates.companyId],
    references: [companies.id],
  }),
}));

// ============================================
// VENDOR RELATIONS
// ============================================

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  company: one(companies, {
    fields: [vendors.companyId],
    references: [companies.id],
  }),
  clientVendors: many(clientVendors),
}));

export const clientVendorsRelations = relations(clientVendors, ({ one }) => ({
  client: one(clients, {
    fields: [clientVendors.clientId],
    references: [clients.id],
  }),
  vendor: one(vendors, {
    fields: [clientVendors.vendorId],
    references: [vendors.id],
  }),
  event: one(events, {
    fields: [clientVendors.eventId],
    references: [events.id],
  }),
}));

// ============================================
// BUDGET RELATIONS
// ============================================

export const budgetRelations = relations(budget, ({ one }) => ({
  client: one(clients, {
    fields: [budget.clientId],
    references: [clients.id],
  }),
}));

// ============================================
// HOTELS & TRANSPORT RELATIONS
// ============================================

export const hotelsRelations = relations(hotels, ({ one }) => ({
  client: one(clients, {
    fields: [hotels.clientId],
    references: [clients.id],
  }),
  guest: one(guests, {
    fields: [hotels.guestId],
    references: [guests.id],
  }),
}));

export const guestTransportRelations = relations(guestTransport, ({ one }) => ({
  client: one(clients, {
    fields: [guestTransport.clientId],
    references: [clients.id],
  }),
  guest: one(guests, {
    fields: [guestTransport.guestId],
    references: [guests.id],
  }),
  vehicle: one(vehicles, {
    fields: [guestTransport.vehicleId],
    references: [vehicles.id],
  }),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  client: one(clients, {
    fields: [vehicles.clientId],
    references: [clients.id],
  }),
  transports: many(guestTransport),
}));

// ============================================
// ACTIVITY RELATIONS
// ============================================

export const activityRelations = relations(activity, ({ one }) => ({
  client: one(clients, {
    fields: [activity.clientId],
    references: [clients.id],
  }),
}));

// ============================================
// PIPELINE CRM RELATIONS
// ============================================

export const pipelineStagesRelations = relations(pipelineStages, ({ one, many }) => ({
  company: one(companies, {
    fields: [pipelineStages.companyId],
    references: [companies.id],
  }),
  leads: many(pipelineLeads),
}));

export const pipelineLeadsRelations = relations(pipelineLeads, ({ one, many }) => ({
  company: one(companies, {
    fields: [pipelineLeads.companyId],
    references: [companies.id],
  }),
  stage: one(pipelineStages, {
    fields: [pipelineLeads.stageId],
    references: [pipelineStages.id],
  }),
  convertedClient: one(clients, {
    fields: [pipelineLeads.convertedToClientId],
    references: [clients.id],
  }),
  activities: many(pipelineActivities),
}));

export const pipelineActivitiesRelations = relations(pipelineActivities, ({ one }) => ({
  lead: one(pipelineLeads, {
    fields: [pipelineActivities.leadId],
    references: [pipelineLeads.id],
  }),
  previousStage: one(pipelineStages, {
    fields: [pipelineActivities.previousStageId],
    references: [pipelineStages.id],
    relationName: 'previousStage',
  }),
  newStage: one(pipelineStages, {
    fields: [pipelineActivities.newStageId],
    references: [pipelineStages.id],
    relationName: 'newStage',
  }),
}));

// ============================================
// CHATBOT RELATIONS
// ============================================

export const chatbotConversationsRelations = relations(chatbotConversations, ({ one, many }) => ({
  user: one(user, {
    fields: [chatbotConversations.userId],
    references: [user.id],
  }),
  client: one(clients, {
    fields: [chatbotConversations.clientId],
    references: [clients.id],
  }),
  messages: many(chatbotMessages),
}));

export const chatbotMessagesRelations = relations(chatbotMessages, ({ one }) => ({
  conversation: one(chatbotConversations, {
    fields: [chatbotMessages.conversationId],
    references: [chatbotConversations.id],
  }),
}));

export const chatbotCommandTemplatesRelations = relations(chatbotCommandTemplates, ({ one }) => ({
  user: one(user, {
    fields: [chatbotCommandTemplates.userId],
    references: [user.id],
  }),
}));

// ============================================
// PROPOSALS & CONTRACTS RELATIONS
// ============================================

export const proposalTemplatesRelations = relations(proposalTemplates, ({ one, many }) => ({
  company: one(companies, {
    fields: [proposalTemplates.companyId],
    references: [companies.id],
  }),
  proposals: many(proposals),
}));

export const proposalsRelations = relations(proposals, ({ one }) => ({
  company: one(companies, {
    fields: [proposals.companyId],
    references: [companies.id],
  }),
  template: one(proposalTemplates, {
    fields: [proposals.templateId],
    references: [proposalTemplates.id],
  }),
  lead: one(pipelineLeads, {
    fields: [proposals.leadId],
    references: [pipelineLeads.id],
  }),
  client: one(clients, {
    fields: [proposals.clientId],
    references: [clients.id],
  }),
}));

export const contractTemplatesRelations = relations(contractTemplates, ({ one, many }) => ({
  company: one(companies, {
    fields: [contractTemplates.companyId],
    references: [companies.id],
  }),
  contracts: many(contracts),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  company: one(companies, {
    fields: [contracts.companyId],
    references: [companies.id],
  }),
  template: one(contractTemplates, {
    fields: [contracts.templateId],
    references: [contractTemplates.id],
  }),
  client: one(clients, {
    fields: [contracts.clientId],
    references: [clients.id],
  }),
}));

// ============================================
// WORKFLOWS RELATIONS
// ============================================

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  company: one(companies, {
    fields: [workflows.companyId],
    references: [companies.id],
  }),
  steps: many(workflowSteps),
  executions: many(workflowExecutions),
}));

export const workflowStepsRelations = relations(workflowSteps, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowSteps.workflowId],
    references: [workflows.id],
  }),
}));

export const workflowExecutionsRelations = relations(workflowExecutions, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowExecutions.workflowId],
    references: [workflows.id],
  }),
}));

// ============================================
// INVITATIONS RELATIONS
// ============================================

export const teamInvitationsRelations = relations(teamInvitations, ({ one }) => ({
  company: one(companies, {
    fields: [teamInvitations.companyId],
    references: [companies.id],
  }),
  invitedByUser: one(user, {
    fields: [teamInvitations.invitedBy],
    references: [user.id],
  }),
}));

export const weddingInvitationsRelations = relations(weddingInvitations, ({ one }) => ({
  client: one(clients, {
    fields: [weddingInvitations.clientId],
    references: [clients.id],
  }),
  company: one(companies, {
    fields: [weddingInvitations.companyId],
    references: [companies.id],
  }),
  invitedByUser: one(user, {
    fields: [weddingInvitations.invitedBy],
    references: [user.id],
  }),
}));

// ============================================
// DOCUMENTS RELATIONS
// ============================================

export const documentsRelations = relations(documents, ({ one }) => ({
  client: one(clients, {
    fields: [documents.clientId],
    references: [clients.id],
  }),
}));

// ============================================
// FLOOR PLANS RELATIONS
// ============================================

export const floorPlansRelations = relations(floorPlans, ({ one, many }) => ({
  client: one(clients, {
    fields: [floorPlans.clientId],
    references: [clients.id],
  }),
  event: one(events, {
    fields: [floorPlans.eventId],
    references: [events.id],
  }),
  tables: many(floorPlanTables),
  guestAssignments: many(floorPlanGuests),
}));

export const floorPlanTablesRelations = relations(floorPlanTables, ({ one, many }) => ({
  floorPlan: one(floorPlans, {
    fields: [floorPlanTables.floorPlanId],
    references: [floorPlans.id],
  }),
  guestAssignments: many(floorPlanGuests),
}));

export const floorPlanGuestsRelations = relations(floorPlanGuests, ({ one }) => ({
  floorPlan: one(floorPlans, {
    fields: [floorPlanGuests.floorPlanId],
    references: [floorPlans.id],
  }),
  table: one(floorPlanTables, {
    fields: [floorPlanGuests.tableId],
    references: [floorPlanTables.id],
  }),
  guest: one(guests, {
    fields: [floorPlanGuests.guestId],
    references: [guests.id],
  }),
}));

// ============================================
// GIFTS RELATIONS
// ============================================

export const giftsRelations = relations(gifts, ({ one }) => ({
  client: one(clients, {
    fields: [gifts.clientId],
    references: [clients.id],
  }),
  guest: one(guests, {
    fields: [gifts.guestId],
    references: [guests.id],
  }),
}));

export const giftsEnhancedRelations = relations(giftsEnhanced, ({ one }) => ({
  client: one(clients, {
    fields: [giftsEnhanced.clientId],
    references: [clients.id],
  }),
  guest: one(guests, {
    fields: [giftsEnhanced.guestId],
    references: [guests.id],
  }),
}));

// ============================================
// MESSAGES RELATIONS
// ============================================

export const messagesRelations = relations(messages, ({ one }) => ({
  company: one(companies, {
    fields: [messages.companyId],
    references: [companies.id],
  }),
  client: one(clients, {
    fields: [messages.clientId],
    references: [clients.id],
  }),
  guest: one(guests, {
    fields: [messages.guestId],
    references: [guests.id],
  }),
  sender: one(user, {
    fields: [messages.senderId],
    references: [user.id],
    relationName: 'sentMessages',
  }),
  receiver: one(user, {
    fields: [messages.receiverId],
    references: [user.id],
    relationName: 'receivedMessages',
  }),
  parent: one(messages, {
    fields: [messages.parentId],
    references: [messages.id],
  }),
}));

// ============================================
// PAYMENTS RELATIONS
// ============================================

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  client: one(clients, {
    fields: [payments.clientId],
    references: [clients.id],
  }),
  refunds: many(refunds),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  payment: one(payments, {
    fields: [refunds.paymentId],
    references: [payments.id],
  }),
}));

// ============================================
// WEDDING WEBSITES RELATIONS
// ============================================

export const weddingWebsitesRelations = relations(weddingWebsites, ({ one }) => ({
  client: one(clients, {
    fields: [weddingWebsites.clientId],
    references: [clients.id],
  }),
}));

// ============================================
// NOTIFICATIONS RELATIONS
// ============================================

export const notificationsRelations = relations(notifications, ({ one }) => ({
  company: one(companies, {
    fields: [notifications.companyId],
    references: [companies.id],
  }),
  userRef: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
}));

// ============================================
// ACCOMMODATIONS RELATIONS
// ============================================

export const accommodationsRelations = relations(accommodations, ({ one, many }) => ({
  client: one(clients, {
    fields: [accommodations.clientId],
    references: [clients.id],
  }),
  hotelAssignments: many(hotels),
}));

// ============================================
// VENDOR COMMENTS & REVIEWS RELATIONS
// ============================================

export const vendorCommentsRelations = relations(vendorComments, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorComments.vendorId],
    references: [vendors.id],
  }),
  author: one(user, {
    fields: [vendorComments.userId],
    references: [user.id],
  }),
}));

export const vendorReviewsRelations = relations(vendorReviews, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorReviews.vendorId],
    references: [vendors.id],
  }),
  client: one(clients, {
    fields: [vendorReviews.clientId],
    references: [clients.id],
  }),
  author: one(user, {
    fields: [vendorReviews.userId],
    references: [user.id],
  }),
}));

// ============================================
// ADVANCE PAYMENTS RELATIONS
// ============================================

export const advancePaymentsRelations = relations(advancePayments, ({ one }) => ({
  budgetItem: one(budget, {
    fields: [advancePayments.budgetItemId],
    references: [budget.id],
  }),
  vendor: one(vendors, {
    fields: [advancePayments.vendorId],
    references: [vendors.id],
  }),
}));

// ============================================
// QUESTIONNAIRE RELATIONS
// ============================================

export const questionnaireTemplatesRelations = relations(questionnaireTemplates, ({ one, many }) => ({
  company: one(companies, {
    fields: [questionnaireTemplates.companyId],
    references: [companies.id],
  }),
  questionnaires: many(questionnaires),
}));

export const questionnairesRelations = relations(questionnaires, ({ one, many }) => ({
  template: one(questionnaireTemplates, {
    fields: [questionnaires.templateId],
    references: [questionnaireTemplates.id],
  }),
  client: one(clients, {
    fields: [questionnaires.clientId],
    references: [clients.id],
  }),
  responses: many(questionnaireResponses),
}));

export const questionnaireResponsesRelations = relations(questionnaireResponses, ({ one }) => ({
  questionnaire: one(questionnaires, {
    fields: [questionnaireResponses.questionnaireId],
    references: [questionnaires.id],
  }),
}));

// ============================================
// GUEST GIFTS RELATIONS (Gifts given to guests)
// ============================================

export const guestGiftsRelations = relations(guestGifts, ({ one }) => ({
  client: one(clients, {
    fields: [guestGifts.clientId],
    references: [clients.id],
  }),
  guest: one(guests, {
    fields: [guestGifts.guestId],
    references: [guests.id],
  }),
}));

// ============================================
// GIFT REGISTRY RELATIONS
// ============================================

export const giftCategoriesRelations = relations(giftCategories, ({ one }) => ({
  company: one(companies, {
    fields: [giftCategories.companyId],
    references: [companies.id],
  }),
}));

export const giftTypesRelations = relations(giftTypes, ({ one }) => ({
  company: one(companies, {
    fields: [giftTypes.companyId],
    references: [companies.id],
  }),
}));

export const thankYouNoteTemplatesRelations = relations(thankYouNoteTemplates, ({ one }) => ({
  company: one(companies, {
    fields: [thankYouNoteTemplates.companyId],
    references: [companies.id],
  }),
}));

// ============================================
// COMMUNICATION LOGS & PREFERENCES RELATIONS
// ============================================

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  client: one(clients, {
    fields: [emailLogs.clientId],
    references: [clients.id],
  }),
  userRef: one(user, {
    fields: [emailLogs.userId],
    references: [user.id],
  }),
}));

export const emailPreferencesRelations = relations(emailPreferences, ({ one }) => ({
  userRef: one(user, {
    fields: [emailPreferences.userId],
    references: [user.id],
  }),
}));

export const smsLogsRelations = relations(smsLogs, ({ one }) => ({
  client: one(clients, {
    fields: [smsLogs.clientId],
    references: [clients.id],
  }),
}));

export const smsTemplatesRelations = relations(smsTemplates, ({ one }) => ({
  company: one(companies, {
    fields: [smsTemplates.companyId],
    references: [companies.id],
  }),
}));

export const smsPreferencesRelations = relations(smsPreferences, ({ one }) => ({
  userRef: one(user, {
    fields: [smsPreferences.userId],
    references: [user.id],
  }),
}));

export const whatsappLogsRelations = relations(whatsappLogs, ({ one }) => ({
  client: one(clients, {
    fields: [whatsappLogs.clientId],
    references: [clients.id],
  }),
}));

export const whatsappTemplatesRelations = relations(whatsappTemplates, ({ one }) => ({
  company: one(companies, {
    fields: [whatsappTemplates.companyId],
    references: [companies.id],
  }),
}));

export const pushLogsRelations = relations(pushLogs, ({ one }) => ({
  userRef: one(user, {
    fields: [pushLogs.userId],
    references: [user.id],
  }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  userRef: one(user, {
    fields: [pushSubscriptions.userId],
    references: [user.id],
  }),
}));

export const pushNotificationLogsRelations = relations(pushNotificationLogs, ({ one }) => ({
  userRef: one(user, {
    fields: [pushNotificationLogs.userId],
    references: [user.id],
  }),
}));

export const pushNotificationPreferencesRelations = relations(pushNotificationPreferences, ({ one }) => ({
  userRef: one(user, {
    fields: [pushNotificationPreferences.userId],
    references: [user.id],
  }),
}));

// ============================================
// STRIPE & PAYMENT RELATIONS
// ============================================

export const stripeAccountsRelations = relations(stripeAccounts, ({ one }) => ({
  company: one(companies, {
    fields: [stripeAccounts.companyId],
    references: [companies.id],
  }),
}));

export const stripeConnectAccountsRelations = relations(stripeConnectAccounts, ({ one }) => ({
  userRef: one(user, {
    fields: [stripeConnectAccounts.userId],
    references: [user.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
}));

// ============================================
// WEBSITE BUILDER RELATIONS
// ============================================

// websiteBuilderLayouts is a global table without company reference

export const websiteBuilderPagesRelations = relations(websiteBuilderPages, ({ one }) => ({
  client: one(clients, {
    fields: [websiteBuilderPages.clientId],
    references: [clients.id],
  }),
  layout: one(websiteBuilderLayouts, {
    fields: [websiteBuilderPages.layoutId],
    references: [websiteBuilderLayouts.id],
  }),
}));

export const websiteBuilderContentRelations = relations(websiteBuilderContent, ({ one }) => ({
  page: one(websiteBuilderPages, {
    fields: [websiteBuilderContent.pageId],
    references: [websiteBuilderPages.id],
  }),
}));

// ============================================
// REPORTS & ANALYTICS RELATIONS
// ============================================

export const scheduledReportsRelations = relations(scheduledReports, ({ one }) => ({
  userRef: one(user, {
    fields: [scheduledReports.userId],
    references: [user.id],
  }),
}));

export const generatedReportsRelations = relations(generatedReports, ({ one }) => ({
  client: one(clients, {
    fields: [generatedReports.clientId],
    references: [clients.id],
  }),
  userRef: one(user, {
    fields: [generatedReports.userId],
    references: [user.id],
  }),
}));

// ============================================
// CALENDAR & SYNC RELATIONS
// ============================================

export const calendarSyncSettingsRelations = relations(calendarSyncSettings, ({ one }) => ({
  userRef: one(user, {
    fields: [calendarSyncSettings.userId],
    references: [user.id],
  }),
}));

export const calendarSyncedEventsRelations = relations(calendarSyncedEvents, ({ one }) => ({
  event: one(events, {
    fields: [calendarSyncedEvents.eventId],
    references: [events.id],
  }),
}));

export const googleCalendarTokensRelations = relations(googleCalendarTokens, ({ one }) => ({
  userRef: one(user, {
    fields: [googleCalendarTokens.userId],
    references: [user.id],
  }),
}));

export const icalFeedTokensRelations = relations(icalFeedTokens, ({ one }) => ({
  userRef: one(user, {
    fields: [icalFeedTokens.userId],
    references: [user.id],
  }),
}));

// ============================================
// CREATIVE & MEDIA RELATIONS
// ============================================

export const creativeJobsRelations = relations(creativeJobs, ({ one }) => ({
  client: one(clients, {
    fields: [creativeJobs.clientId],
    references: [clients.id],
  }),
}));

export const qrCodesRelations = relations(qrCodes, ({ one }) => ({
  client: one(clients, {
    fields: [qrCodes.clientId],
    references: [clients.id],
  }),
}));

// ============================================
// HOTEL BOOKINGS RELATIONS
// ============================================

export const hotelBookingsRelations = relations(hotelBookings, ({ one }) => ({
  hotel: one(hotels, {
    fields: [hotelBookings.hotelId],
    references: [hotels.id],
  }),
  guest: one(guests, {
    fields: [hotelBookings.guestId],
    references: [guests.id],
  }),
}));

// ============================================
// GUEST PREFERENCES & CONFLICTS RELATIONS
// ============================================

export const guestPreferencesRelations = relations(guestPreferences, ({ one }) => ({
  guest: one(guests, {
    fields: [guestPreferences.guestId],
    references: [guests.id],
  }),
}));

export const guestConflictsRelations = relations(guestConflicts, ({ one }) => ({
  guest1: one(guests, {
    fields: [guestConflicts.guest1Id],
    references: [guests.id],
    relationName: 'guest1',
  }),
  guest2: one(guests, {
    fields: [guestConflicts.guest2Id],
    references: [guests.id],
    relationName: 'guest2',
  }),
}));

// ============================================
// SEATING RELATIONS
// ============================================

export const seatingChangeLogRelations = relations(seatingChangeLog, ({ one }) => ({
  floorPlan: one(floorPlans, {
    fields: [seatingChangeLog.floorPlanId],
    references: [floorPlans.id],
  }),
  userRef: one(user, {
    fields: [seatingChangeLog.userId],
    references: [user.id],
  }),
}));

export const seatingVersionsRelations = relations(seatingVersions, ({ one }) => ({
  floorPlan: one(floorPlans, {
    fields: [seatingVersions.floorPlanId],
    references: [floorPlans.id],
  }),
}));

// ============================================
// TEAM ASSIGNMENTS RELATIONS
// ============================================

export const teamClientAssignmentsRelations = relations(teamClientAssignments, ({ one }) => ({
  teamMember: one(user, {
    fields: [teamClientAssignments.teamMemberId],
    references: [user.id],
  }),
  client: one(clients, {
    fields: [teamClientAssignments.clientId],
    references: [clients.id],
  }),
}));

// ============================================
// WORKFLOW EXECUTION LOGS RELATIONS
// ============================================

export const workflowExecutionLogsRelations = relations(workflowExecutionLogs, ({ one }) => ({
  execution: one(workflowExecutions, {
    fields: [workflowExecutionLogs.executionId],
    references: [workflowExecutions.id],
  }),
  step: one(workflowSteps, {
    fields: [workflowExecutionLogs.stepId],
    references: [workflowSteps.id],
  }),
}));

// ============================================
// CHATBOT PENDING CALLS RELATIONS
// ============================================

export const chatbotPendingCallsRelations = relations(chatbotPendingCalls, ({ one }) => ({
  userRef: one(user, {
    fields: [chatbotPendingCalls.userId],
    references: [user.id],
  }),
  company: one(companies, {
    fields: [chatbotPendingCalls.companyId],
    references: [companies.id],
  }),
}));
