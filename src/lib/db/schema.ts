import { pgTable, text, timestamp, boolean, index, integer } from 'drizzle-orm/pg-core';

/**
 * Database Schema
 *
 * December 2025 - Drizzle ORM schema definitions for BetterAuth
 */

// User table - BetterAuth core table with custom extensions
// This is the SOURCE OF TRUTH for user data - February 2026
export const user = pgTable('user', {
  // Core BetterAuth fields
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  // Authorization fields
  role: text('role').default('company_admin'),
  companyId: text('company_id'),

  // Profile fields
  firstName: text('first_name'),
  lastName: text('last_name'),
  avatarUrl: text('avatar_url'), // Added Feb 2026 - replaces users.avatarUrl
  phoneNumber: text('phone_number'),
  phoneNumberVerified: boolean('phone_number_verified').default(false),

  // User preferences
  preferredLanguage: text('preferred_language').default('en'),
  preferredCurrency: text('preferred_currency').default('USD'),
  timezone: text('timezone').default('UTC'),
  autoDetectLocale: boolean('auto_detect_locale').default(true),

  // Status fields
  isActive: boolean('is_active').default(true), // Added Feb 2026 - replaces users.isActive
  onboardingCompleted: boolean('onboarding_completed').default(false),

  // Security fields
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  isAnonymous: boolean('is_anonymous').default(false),
}, (table) => [
  index('user_company_id_idx').on(table.companyId),
  index('user_email_idx').on(table.email),
]);

// Session table
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('session_user_id_idx').on(table.userId),
  index('session_expires_at_idx').on(table.expiresAt),
]);

// Account table (for credentials and OAuth)
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('account_user_id_idx').on(table.userId),
]);

// Verification table (for email verification, password reset)
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('verification_identifier_idx').on(table.identifier),
]);

// Webhook events table for idempotency tracking
export const webhookEvents = pgTable('webhook_events', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(), // 'stripe', 'resend', etc.
  eventId: text('event_id').notNull(), // External event ID
  eventType: text('event_type').notNull(), // 'payment.succeeded', etc.
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at'),
  payload: text('payload'), // JSON payload as text
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('webhook_events_event_id_idx').on(table.eventId),
  index('webhook_events_provider_idx').on(table.provider),
]);

/**
 * Rate Limit Entries - UNLOGGED Table
 *
 * February 2026 - PostgreSQL UNLOGGED table for auth rate limiting
 *
 * Why UNLOGGED instead of Redis:
 * - No additional infrastructure needed
 * - 2x faster writes than logged tables
 * - Acceptable durability (rate limit data is ephemeral)
 * - Fixed window algorithm: simple key + count + reset time
 *
 * Note: Created as UNLOGGED via migration SQL
 */
export const rateLimitEntries = pgTable('rate_limit_entries', {
  key: text('key').primaryKey(), // e.g., "signin:192.168.1.1"
  count: integer('count').notNull().default(1),
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('rate_limit_reset_idx').on(table.resetAt),
]);

// Re-export common tables for other features
export * from './schema-features';
export * from './schema-pipeline';
export * from './schema-proposals';
export * from './schema-workflows';
export * from './schema-questionnaires';
export * from './schema-invitations';
export * from './schema-chatbot';
// Note: schema-relations is exported separately to avoid circular imports
// Import relations from '@/lib/db/schema-relations' directly when needed
