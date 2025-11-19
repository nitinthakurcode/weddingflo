/**
 * Clients Feature Pocket
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
 * - Supabase: clients table
 * - Clerk: Authentication
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
