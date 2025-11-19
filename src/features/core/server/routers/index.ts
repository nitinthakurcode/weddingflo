/**
 * Core Feature - tRPC Routers
 *
 * Business Domain: Identity & Tenant Management
 * Routers:
 * - users: User profile, preferences, authentication context
 * - companies: Company/tenant management, settings
 *
 * Dependencies:
 * - Supabase (users, companies tables)
 * - Clerk (authentication provider)
 *
 * Scope:
 * - Cross-cutting concerns used by ALL features
 * - User session context
 * - Multi-tenancy (company isolation)
 * - User preferences (language, currency, timezone)
 *
 * Security:
 * - All procedures protected by Clerk authentication
 * - Company ID enforced from session claims
 * - Row-level security on database tables
 *
 * Rate Limits:
 * - Read: 1000/min per user
 * - Write: 100/min per user
 */

export { usersRouter } from './users.router';
export { companiesRouter } from './companies.router';
