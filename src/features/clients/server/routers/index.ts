/**
 * Clients Feature - tRPC Routers
 * December 2025 - BetterAuth + Drizzle + Hetzner PostgreSQL
 *
 * Business Domain: Client Relationship Management
 * Routers:
 * - clients: CRUD operations for wedding clients
 * - onboarding: New client onboarding flow
 *
 * Dependencies:
 * - Drizzle ORM (clients table on Hetzner PostgreSQL)
 * - BetterAuth (self-hosted authentication)
 *
 * Owner: Client Management Team
 */

export { clientsRouter } from './clients.router';
export { onboardingRouter } from './onboarding.router';
export { pipelineRouter } from './pipeline.router';
