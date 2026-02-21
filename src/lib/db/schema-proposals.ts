import { pgTable, text, timestamp, boolean, jsonb, uuid, numeric, index, pgEnum } from 'drizzle-orm/pg-core';

/**
 * Proposals & Contracts Schema
 *
 * February 2026 - Proposals, contracts, and e-signature system for WeddingFlo
 *
 * Tables:
 * - proposal_templates: Company templates for proposals
 * - proposals: Individual proposals with service packages
 * - contract_templates: Company templates for contracts
 * - contracts: Individual contracts with signature data
 */

// Proposal status enum
export const proposalStatusEnum = pgEnum('proposal_status', ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired']);

// Contract status enum
export const contractStatusEnum = pgEnum('contract_status', ['draft', 'pending_signature', 'signed', 'expired', 'cancelled']);

/**
 * Proposal Templates - Company templates for quick proposal creation
 */
export const proposalTemplates = pgTable('proposal_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),

  // Template content
  introText: text('intro_text'),
  termsText: text('terms_text'),
  signatureText: text('signature_text'),

  // Default service packages (JSON array)
  // [{ name, description, price, items: [{ name, quantity, unitPrice }] }]
  defaultPackages: jsonb('default_packages'),

  // Styling
  headerImageUrl: text('header_image_url'),
  accentColor: text('accent_color').default('#6B7280'),

  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('proposal_templates_company_idx').on(table.companyId),
]);

/**
 * Proposals - Individual proposals sent to leads/clients
 */
export const proposals = pgTable('proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),
  templateId: uuid('template_id'), // FK to proposal_templates

  // Link to lead or client
  leadId: uuid('lead_id'), // FK to pipeline_leads
  clientId: text('client_id'), // FK to clients

  // Proposal info
  title: text('title').notNull(),
  proposalNumber: text('proposal_number'), // e.g., "PROP-2026-001"
  status: proposalStatusEnum('status').default('draft'),

  // Recipient info (snapshot at time of sending)
  recipientName: text('recipient_name'),
  recipientEmail: text('recipient_email'),
  recipientPhone: text('recipient_phone'),

  // Wedding details
  weddingDate: text('wedding_date'),
  venue: text('venue'),
  guestCount: text('guest_count'),

  // Content
  introText: text('intro_text'),
  servicePackages: jsonb('service_packages'), // Array of packages with prices
  termsText: text('terms_text'),

  // Pricing
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }),
  discount: numeric('discount', { precision: 15, scale: 2 }).default('0'),
  discountType: text('discount_type').default('fixed'), // 'fixed' or 'percentage'
  tax: numeric('tax', { precision: 15, scale: 2 }).default('0'),
  total: numeric('total', { precision: 15, scale: 2 }),
  currency: text('currency').default('USD'),

  // Validity
  validUntil: timestamp('valid_until'),
  sentAt: timestamp('sent_at'),
  viewedAt: timestamp('viewed_at'),
  respondedAt: timestamp('responded_at'),

  // Public access
  publicToken: text('public_token').unique(), // For client viewing without auth
  publicUrl: text('public_url'),

  // Response
  clientResponse: text('client_response'), // 'accepted' or 'declined'
  clientResponseNotes: text('client_response_notes'),
  clientSignature: jsonb('client_signature'), // Base64 signature data

  // Metadata
  metadata: jsonb('metadata'),
  createdBy: text('created_by'), // User who created
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('proposals_company_idx').on(table.companyId),
  index('proposals_lead_idx').on(table.leadId),
  index('proposals_client_idx').on(table.clientId),
  index('proposals_status_idx').on(table.status),
  index('proposals_public_token_idx').on(table.publicToken),
]);

/**
 * Contract Templates - Company templates with {{variable}} placeholders
 */
export const contractTemplates = pgTable('contract_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),

  // Template content with {{variables}}
  // Available variables: {{client_name}}, {{partner1_name}}, {{partner2_name}},
  // {{wedding_date}}, {{venue}}, {{total_amount}}, {{deposit_amount}}, etc.
  content: text('content').notNull(),

  // Variables available in this template (for UI hints)
  availableVariables: text('available_variables').array(),

  // Signature config
  requireClientSignature: boolean('require_client_signature').default(true),
  requirePlannerSignature: boolean('require_planner_signature').default(true),
  signaturesRequired: text('signatures_required').default('both'), // 'client', 'planner', 'both'

  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('contract_templates_company_idx').on(table.companyId),
]);

/**
 * Contracts - Individual contracts with signature tracking
 */
export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),
  templateId: uuid('template_id'), // FK to contract_templates
  proposalId: uuid('proposal_id'), // FK to proposals (if created from proposal)

  // Link to client
  clientId: text('client_id'), // FK to clients

  // Contract info
  title: text('title').notNull(),
  contractNumber: text('contract_number'), // e.g., "CONTRACT-2026-001"
  status: contractStatusEnum('status').default('draft'),

  // Client info (snapshot at time of creation)
  clientName: text('client_name'),
  clientEmail: text('client_email'),
  clientPhone: text('client_phone'),
  clientAddress: text('client_address'),

  // Wedding details
  weddingDate: text('wedding_date'),
  venue: text('venue'),

  // Contract content (rendered from template with variables replaced)
  content: text('content').notNull(),

  // Payment terms
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }),
  depositAmount: numeric('deposit_amount', { precision: 15, scale: 2 }),
  depositDueDate: timestamp('deposit_due_date'),
  finalPaymentDueDate: timestamp('final_payment_due_date'),
  paymentSchedule: jsonb('payment_schedule'), // Array of { amount, dueDate, description }
  currency: text('currency').default('USD'),

  // Validity
  validUntil: timestamp('valid_until'),
  sentAt: timestamp('sent_at'),
  viewedAt: timestamp('viewed_at'),

  // Public access
  publicToken: text('public_token').unique(), // For client viewing/signing without auth
  publicUrl: text('public_url'),

  // Signatures
  clientSignatureData: jsonb('client_signature_data'), // { signature: base64, name, date, ip }
  clientSignedAt: timestamp('client_signed_at'),
  plannerSignatureData: jsonb('planner_signature_data'), // { signature: base64, name, date }
  plannerSignedAt: timestamp('planner_signed_at'),

  // Fully executed
  fullyExecutedAt: timestamp('fully_executed_at'),
  pdfUrl: text('pdf_url'), // Generated PDF of signed contract

  // Metadata
  metadata: jsonb('metadata'),
  createdBy: text('created_by'), // User who created
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('contracts_company_idx').on(table.companyId),
  index('contracts_client_idx').on(table.clientId),
  index('contracts_proposal_idx').on(table.proposalId),
  index('contracts_status_idx').on(table.status),
  index('contracts_public_token_idx').on(table.publicToken),
]);

/**
 * Default contract template content
 */
export const DEFAULT_CONTRACT_TEMPLATE = `
WEDDING PLANNING SERVICES AGREEMENT

This Agreement is entered into as of {{current_date}} between:

SERVICE PROVIDER:
{{company_name}}
{{company_address}}
{{company_email}}
{{company_phone}}

CLIENT:
{{client_name}}
{{client_email}}
{{client_phone}}
{{client_address}}

EVENT DETAILS:
Wedding Date: {{wedding_date}}
Venue: {{venue}}
Estimated Guest Count: {{guest_count}}

SERVICES:
The Service Provider agrees to provide wedding planning services as detailed in the attached proposal.

PAYMENT TERMS:
Total Contract Amount: {{currency}} {{total_amount}}
Deposit Due: {{currency}} {{deposit_amount}} (due upon signing)
Final Payment: {{currency}} {{final_payment_amount}} (due {{final_payment_due_date}})

CANCELLATION POLICY:
- Cancellation more than 90 days before event: Deposit is forfeited
- Cancellation 30-90 days before event: 50% of total fee is due
- Cancellation less than 30 days before event: 100% of total fee is due

LIMITATION OF LIABILITY:
The Service Provider's liability is limited to the total amount paid under this agreement.

SIGNATURES:

Client Signature: ___________________________ Date: _______________

Service Provider Signature: _________________ Date: _______________
`;

/**
 * Default available variables for contracts
 */
export const DEFAULT_CONTRACT_VARIABLES = [
  'current_date',
  'company_name',
  'company_address',
  'company_email',
  'company_phone',
  'client_name',
  'client_email',
  'client_phone',
  'client_address',
  'partner1_name',
  'partner2_name',
  'wedding_date',
  'venue',
  'guest_count',
  'total_amount',
  'deposit_amount',
  'final_payment_amount',
  'final_payment_due_date',
  'currency',
];
