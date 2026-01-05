/**
 * Clients Feature Pocket
 * December 2025 - BetterAuth + Drizzle + Hetzner PostgreSQL
 *
 * @description Client relationship management system
 * @owner Client Management Team
 * @stability stable
 *
 * ## Capabilities
 * - Client CRUD operations
 * - Multi-client support per company
 * - Wedding date & budget tracking
 * - Client onboarding flow
 *
 * ## External Dependencies
 * - Drizzle ORM: clients table on Hetzner PostgreSQL
 * - BetterAuth: Self-hosted authentication
 *
 * ## Database Tables
 * - clients (primary)
 * - users (relationship)
 * - companies (relationship)
 *
 * ## Rate Limits
 * - Read: 1000/min per company
 * - Write: 100/min per company
 */

// Server-side exports
export * from './server/routers';

// Future: Client-side exports (components, hooks)
// export * from './components';
// export * from './hooks';
