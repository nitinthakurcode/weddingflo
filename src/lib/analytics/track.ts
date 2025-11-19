import posthog from 'posthog-js';

export const track = {
  // Client events
  clientCreated: (clientId: string, companyId: string) => {
    posthog.capture('client_created', { client_id: clientId, company_id: companyId });
  },

  clientUpdated: (clientId: string) => {
    posthog.capture('client_updated', { client_id: clientId });
  },

  // Guest events
  guestImported: (count: number, method: 'csv' | 'manual') => {
    posthog.capture('guest_imported', { count, method });
  },

  rsvpUpdated: (guestId: string, status: string) => {
    posthog.capture('rsvp_updated', { guest_id: guestId, status });
  },

  // AI events
  aiFeatureUsed: (feature: 'budget' | 'email' | 'timeline' | 'seating') => {
    posthog.capture('ai_feature_used', { feature });
  },

  // Payment events
  paymentReceived: (amount: number, currency: string) => {
    posthog.capture('payment_received', { amount, currency });
  },

  invoiceCreated: (invoiceId: string, total: number) => {
    posthog.capture('invoice_created', { invoice_id: invoiceId, total });
  }
};
