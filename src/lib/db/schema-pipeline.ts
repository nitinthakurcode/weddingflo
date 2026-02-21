import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, numeric, index, pgEnum } from 'drizzle-orm/pg-core';

/**
 * Pipeline CRM Schema
 *
 * February 2026 - Lead management and sales pipeline for WeddingFlo
 *
 * Tables:
 * - pipeline_stages: Customizable stages (New Inquiry -> Active Client -> Lost)
 * - pipeline_leads: Lead records with budget, source, assignee
 * - pipeline_activities: Activity log (notes, calls, emails, stage changes)
 */

// Lead status enum
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost']);

// Activity type enum
export const activityTypeEnum = pgEnum('activity_type', ['note', 'call', 'email', 'meeting', 'task', 'stage_change', 'proposal_sent', 'follow_up']);

/**
 * Pipeline Stages - Company-customizable pipeline stages
 */
export const pipelineStages = pgTable('pipeline_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#6B7280'), // Tailwind gray-500
  sortOrder: integer('sort_order').default(0),
  isDefault: boolean('is_default').default(false), // Default stage for new leads
  isWon: boolean('is_won').default(false), // Marks this as "won" stage (converts to client)
  isLost: boolean('is_lost').default(false), // Marks this as "lost" stage
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('pipeline_stages_company_idx').on(table.companyId),
  index('pipeline_stages_sort_idx').on(table.companyId, table.sortOrder),
]);

/**
 * Pipeline Leads - Individual lead records
 */
export const pipelineLeads = pgTable('pipeline_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),
  stageId: uuid('stage_id').notNull(), // FK to pipeline_stages

  // Lead contact info
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  email: text('email'),
  phone: text('phone'),

  // Partner info (for weddings)
  partnerFirstName: text('partner_first_name'),
  partnerLastName: text('partner_last_name'),
  partnerEmail: text('partner_email'),
  partnerPhone: text('partner_phone'),

  // Wedding details
  weddingDate: text('wedding_date'),
  venue: text('venue'),
  estimatedGuestCount: integer('estimated_guest_count'),
  estimatedBudget: numeric('estimated_budget', { precision: 15, scale: 2 }),
  weddingType: text('wedding_type'), // traditional, destination, etc.

  // Lead metadata
  source: text('source'), // website, referral, social_media, wedding_fair, etc.
  referralSource: text('referral_source'), // If source is referral, who referred
  priority: text('priority').default('medium'), // low, medium, high, urgent
  score: integer('score').default(0), // Lead scoring (0-100)

  // Assignment
  assigneeId: text('assignee_id'), // FK to users.id

  // Status tracking
  status: leadStatusEnum('status').default('new'),
  lastContactedAt: timestamp('last_contacted_at'),
  nextFollowUpAt: timestamp('next_follow_up_at'),

  // Conversion tracking
  convertedToClientId: text('converted_to_client_id'), // FK to clients.id when converted
  convertedAt: timestamp('converted_at'),
  lostReason: text('lost_reason'), // Why was the lead lost

  // Additional info
  notes: text('notes'),
  tags: text('tags').array(), // For categorization
  metadata: jsonb('metadata'), // Flexible additional data

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('pipeline_leads_company_idx').on(table.companyId),
  index('pipeline_leads_stage_idx').on(table.stageId),
  index('pipeline_leads_assignee_idx').on(table.assigneeId),
  index('pipeline_leads_status_idx').on(table.status),
  index('pipeline_leads_email_idx').on(table.email),
]);

/**
 * Pipeline Activities - Activity log for leads
 */
export const pipelineActivities = pgTable('pipeline_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').notNull(), // FK to pipeline_leads
  companyId: text('company_id').notNull(),
  userId: text('user_id').notNull(), // Who performed the activity

  type: activityTypeEnum('type').notNull(),
  title: text('title').notNull(),
  description: text('description'),

  // For stage changes
  previousStageId: uuid('previous_stage_id'),
  newStageId: uuid('new_stage_id'),

  // For tasks/follow-ups
  dueAt: timestamp('due_at'),
  completedAt: timestamp('completed_at'),
  isCompleted: boolean('is_completed').default(false),

  // Metadata
  metadata: jsonb('metadata'), // Email ID, call duration, etc.

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('pipeline_activities_lead_idx').on(table.leadId),
  index('pipeline_activities_company_idx').on(table.companyId),
  index('pipeline_activities_user_idx').on(table.userId),
  index('pipeline_activities_type_idx').on(table.type),
]);

/**
 * Default pipeline stages for new companies
 */
export const DEFAULT_PIPELINE_STAGES = [
  { name: 'New Inquiry', color: '#3B82F6', sortOrder: 0, isDefault: true },
  { name: 'Contacted', color: '#8B5CF6', sortOrder: 1 },
  { name: 'Meeting Scheduled', color: '#EC4899', sortOrder: 2 },
  { name: 'Proposal Sent', color: '#F59E0B', sortOrder: 3 },
  { name: 'Negotiating', color: '#10B981', sortOrder: 4 },
  { name: 'Active Client', color: '#22C55E', sortOrder: 5, isWon: true },
  { name: 'Lost', color: '#EF4444', sortOrder: 6, isLost: true },
];
