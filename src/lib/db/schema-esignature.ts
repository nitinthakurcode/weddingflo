import { pgTable, text, timestamp, boolean, integer, jsonb, real, uuid, index, pgEnum } from 'drizzle-orm/pg-core';
import { documents } from './schema-features';

/**
 * E-Signature Schema
 *
 * April 2026 - Self-hosted e-signature system for WeddingFlo Documents
 *
 * Tables:
 * - document_signature_requests: Signing sessions per document
 * - document_signers: Individual signers per request
 * - document_signature_fields: PDF field placement (sign here, initial, date, etc.)
 * - document_audit_trail: Immutable audit log for all signing events
 * - document_signature_templates: Reusable field layout templates
 */

// Enums
export const signatureRequestStatusEnum = pgEnum('signature_request_status', [
  'draft', 'pending', 'partially_signed', 'completed', 'expired', 'cancelled', 'voided',
]);

export const signerStatusEnum = pgEnum('signer_status', [
  'pending', 'sent', 'viewed', 'signed', 'declined', 'expired',
]);

export const signingOrderEnum = pgEnum('signing_order', ['parallel', 'sequential']);

export const signatureFieldTypeEnum = pgEnum('signature_field_type', [
  'signature', 'initial', 'date', 'text', 'checkbox',
]);

export const signatureAuditActionEnum = pgEnum('signature_audit_action', [
  'created', 'sent', 'viewed', 'signed', 'declined', 'reminded',
  'expired', 'voided', 'cancelled', 'downloaded', 'completed',
]);

/**
 * Document Signature Requests — one per document signing session
 */
export const documentSignatureRequests = pgTable('document_signature_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  clientId: text('client_id').notNull(),
  companyId: text('company_id').notNull(),
  status: signatureRequestStatusEnum('status').notNull().default('draft'),
  publicToken: text('public_token').notNull().unique(),
  title: text('title').notNull(),
  message: text('message'),
  signingOrder: signingOrderEnum('signing_order').notNull().default('parallel'),
  expiresAt: timestamp('expires_at'),
  completedAt: timestamp('completed_at'),
  voidedAt: timestamp('voided_at'),
  voidReason: text('void_reason'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('sig_requests_document_id_idx').on(table.documentId),
  index('sig_requests_client_id_idx').on(table.clientId),
  index('sig_requests_company_id_idx').on(table.companyId),
  index('sig_requests_status_idx').on(table.status),
  index('sig_requests_public_token_idx').on(table.publicToken),
]);

/**
 * Document Signers — each signer in a signing request
 */
export const documentSigners = pgTable('document_signers', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').notNull().references(() => documentSignatureRequests.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role'),
  signingOrder: integer('signing_order').default(1),
  status: signerStatusEnum('status').notNull().default('pending'),
  signatureData: jsonb('signature_data'), // { signature: base64, name, date, ipAddress }
  signedAt: timestamp('signed_at'),
  viewedAt: timestamp('viewed_at'),
  sentAt: timestamp('sent_at'),
  publicToken: text('public_token').notNull().unique(),
  declineReason: text('decline_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('signers_request_id_idx').on(table.requestId),
  index('signers_email_idx').on(table.email),
  index('signers_public_token_idx').on(table.publicToken),
  index('signers_status_idx').on(table.status),
]);

/**
 * Document Signature Fields — PDF field placement (sign here, initial, date, etc.)
 */
export const documentSignatureFields = pgTable('document_signature_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').notNull().references(() => documentSignatureRequests.id, { onDelete: 'cascade' }),
  signerId: uuid('signer_id').notNull().references(() => documentSigners.id, { onDelete: 'cascade' }),
  type: signatureFieldTypeEnum('type').notNull(),
  page: integer('page').notNull().default(1),
  x: real('x').notNull(),
  y: real('y').notNull(),
  width: real('width').notNull(),
  height: real('height').notNull(),
  required: boolean('required').notNull().default(true),
  value: text('value'),
  label: text('label'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('sig_fields_request_id_idx').on(table.requestId),
  index('sig_fields_signer_id_idx').on(table.signerId),
]);

/**
 * Document Audit Trail — immutable log for all signing events
 */
export const documentAuditTrail = pgTable('document_audit_trail', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').notNull().references(() => documentSignatureRequests.id, { onDelete: 'cascade' }),
  signerId: uuid('signer_id').references(() => documentSigners.id, { onDelete: 'set null' }),
  action: signatureAuditActionEnum('action').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('audit_trail_request_id_idx').on(table.requestId),
  index('audit_trail_action_idx').on(table.action),
  index('audit_trail_created_at_idx').on(table.createdAt),
]);

/**
 * Document Signature Templates — reusable field layout templates
 */
export const documentSignatureTemplates = pgTable('document_signature_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  fields: jsonb('fields').notNull(), // Array of { type, page, x, y, width, height, required, label, signerRole }
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('sig_templates_company_id_idx').on(table.companyId),
]);
