import { pgTable, text, timestamp, uuid, index, boolean } from 'drizzle-orm/pg-core';

/**
 * Invitation Schema - February 2026
 *
 * Manages invitations for team members and client users.
 * Implements proper invitation flows instead of direct user creation.
 */

/**
 * Team Invitations - For inviting staff members to a company
 *
 * Flow:
 * 1. Admin invites staff -> Creates invitation with token
 * 2. Staff receives email with signup link
 * 3. Staff signs up via BetterAuth
 * 4. On signup, role and companyId assigned from invitation
 */
export const teamInvitations = pgTable('team_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(), // References companies.id
  email: text('email').notNull(),
  role: text('role').notNull().default('staff'), // 'staff' | 'company_admin'
  token: text('token').notNull().unique(),
  invitedBy: text('invited_by').notNull(), // References user.id
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  acceptedBy: text('accepted_by'), // References user.id of accepted user
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('team_invitations_token_idx').on(table.token),
  index('team_invitations_email_idx').on(table.email),
  index('team_invitations_company_id_idx').on(table.companyId),
]);

/**
 * Wedding Invitations - For inviting clients/couples to access their wedding portal
 *
 * Flow:
 * 1. Company admin invites couple -> Creates invitation with token
 * 2. Couple receives email with portal signup link
 * 3. Couple signs up via BetterAuth as client_user
 * 4. On signup, linked to their wedding via client_users table
 */
export const weddingInvitations = pgTable('wedding_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: text('client_id').notNull(), // References clients.id
  companyId: text('company_id').notNull(), // References companies.id (denormalized for queries)
  email: text('email').notNull(),
  relationship: text('relationship'), // 'bride', 'groom', 'family_bride', 'family_groom', 'other'
  token: text('token').notNull().unique(),
  invitedBy: text('invited_by').notNull(), // References user.id
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  acceptedBy: text('accepted_by'), // References user.id of accepted user
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('wedding_invitations_token_idx').on(table.token),
  index('wedding_invitations_email_idx').on(table.email),
  index('wedding_invitations_client_id_idx').on(table.clientId),
]);
