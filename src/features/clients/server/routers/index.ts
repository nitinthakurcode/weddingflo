/**
 * Clients Feature - tRPC Routers
 *
 * Business Domain: Client Relationship Management
 * Routers:
 * - clients: CRUD operations for wedding clients
 * - onboarding: New client onboarding flow
 *
 * Dependencies:
 * - Supabase (clients table)
 * - Clerk (authentication)
 *
 * Owner: Client Management Team
 */

export { clientsRouter } from './clients.router';
export { onboardingRouter } from './onboarding.router';
