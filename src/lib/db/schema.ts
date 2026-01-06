import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

/**
 * Database Schema
 *
 * December 2025 - Drizzle ORM schema definitions for BetterAuth
 */

// User table - BetterAuth core table with custom extensions
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
  phoneNumber: text('phone_number'),
  phoneNumberVerified: boolean('phone_number_verified').default(false),

  // User preferences
  preferredLanguage: text('preferred_language').default('en'),
  preferredCurrency: text('preferred_currency').default('USD'),
  timezone: text('timezone').default('UTC'),
  autoDetectLocale: boolean('auto_detect_locale').default(true),

  // Onboarding status
  onboardingCompleted: boolean('onboarding_completed').default(false),

  // Security fields
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  isAnonymous: boolean('is_anonymous').default(false),
});

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
});

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
});

// Verification table (for email verification, password reset)
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Re-export common tables for other features
export * from './schema-features';
