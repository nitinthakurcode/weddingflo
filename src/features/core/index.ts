/**
 * Core Feature Pocket
 * December 2025 - BetterAuth + Drizzle + Hetzner PostgreSQL
 *
 * @description Identity, authentication, and tenant management
 * @owner Platform Team
 * @stability stable
 *
 * ## Capabilities
 * - User profile management
 * - User preferences (currency, language, timezone)
 * - Company/tenant context
 * - Multi-tenancy enforcement
 * - Session management
 *
 * ## External Dependencies
 * - Drizzle ORM: users, companies tables on Hetzner PostgreSQL
 * - BetterAuth: Self-hosted authentication
 *
 * ## Database Tables
 * - users (primary)
 * - companies (primary)
 *
 * ## Usage Across Features
 * - ALL features depend on core for user/company context
 * - Session provides userId and companyId
 * - Preferences affect UI/UX across all features
 *
 * ## Rate Limits
 * - Read: 1000/min per user
 * - Write: 100/min per user
 *
 * ## Architecture Notes
 * This is a foundational pocket - changes here affect all features.
 * Use extreme caution when modifying core functionality.
 */

export * from './server/routers';
