/**
 * Core Feature - tRPC Routers
 * December 2025 - BetterAuth + Drizzle + Hetzner PostgreSQL
 *
 * Business Domain: Identity & Tenant Management
 * Routers:
 * - users: User profile, preferences, authentication context
 * - companies: Company/tenant management, settings
 *
 * Dependencies:
 * - Drizzle ORM (users, companies tables on Hetzner PostgreSQL)
 * - BetterAuth (self-hosted authentication)
 *
 * Scope:
 * - Cross-cutting concerns used by ALL features
 * - User session context
 * - Multi-tenancy (company isolation)
 * - User preferences (language, currency, timezone)
 *
 * Security:
 * - All procedures protected by BetterAuth authentication
 * - Company ID enforced from session
 * - Application-level RLS via Drizzle query filters
 *
 * Rate Limits:
 * - Read: 1000/min per user
 * - Write: 100/min per user
 */

export { usersRouter } from './users.router';
export { companiesRouter } from './companies.router';
export { activityRouter } from './activity.router';
