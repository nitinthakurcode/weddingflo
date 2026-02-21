import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, index, pgEnum } from 'drizzle-orm/pg-core';

/**
 * Workflows Schema
 *
 * February 2026 - Workflow automation system for WeddingFlo
 *
 * Tables:
 * - workflows: Workflow definitions with trigger configs
 * - workflow_steps: Individual steps (send_email, wait, condition, create_task)
 * - workflow_executions: Execution tracking with state
 * - workflow_execution_logs: Step-by-step audit log
 */

// Workflow trigger type enum
export const workflowTriggerTypeEnum = pgEnum('workflow_trigger_type', [
  'lead_stage_change',
  'client_created',
  'event_date_approaching',
  'payment_overdue',
  'rsvp_received',
  'proposal_accepted',
  'contract_signed',
  'scheduled',
  'manual',
]);

// Workflow step type enum
export const workflowStepTypeEnum = pgEnum('workflow_step_type', [
  'send_email',
  'send_sms',
  'send_whatsapp',
  'wait',
  'condition',
  'create_task',
  'update_lead',
  'update_client',
  'create_notification',
  'webhook',
]);

// Workflow execution status enum
export const workflowExecutionStatusEnum = pgEnum('workflow_execution_status', [
  'running',
  'waiting',
  'completed',
  'failed',
  'cancelled',
]);

/**
 * Workflows - Workflow definitions
 */
export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),

  // Trigger configuration
  triggerType: workflowTriggerTypeEnum('trigger_type').notNull(),
  triggerConfig: jsonb('trigger_config'), // Trigger-specific config (e.g., stageId for stage_change)

  // For scheduled triggers
  cronExpression: text('cron_expression'),
  timezone: text('timezone').default('UTC'),

  // Status
  isActive: boolean('is_active').default(true),
  isTemplate: boolean('is_template').default(false), // Pre-built template

  // Metadata
  metadata: jsonb('metadata'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('workflows_company_idx').on(table.companyId),
  index('workflows_trigger_type_idx').on(table.triggerType),
  index('workflows_is_active_idx').on(table.isActive),
]);

/**
 * Workflow Steps - Individual steps in a workflow
 */
export const workflowSteps = pgTable('workflow_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull(), // FK to workflows
  stepType: workflowStepTypeEnum('step_type').notNull(),
  stepOrder: integer('step_order').notNull().default(0),

  // Step name for display
  name: text('name'),

  // Step configuration (varies by type)
  config: jsonb('config'), // e.g., { templateId, subject, body } for send_email

  // For wait steps
  waitDuration: integer('wait_duration'), // Duration in minutes
  waitUnit: text('wait_unit').default('minutes'), // minutes, hours, days

  // For condition steps
  conditionType: text('condition_type'), // field_equals, field_contains, date_passed
  conditionField: text('condition_field'),
  conditionOperator: text('condition_operator'),
  conditionValue: text('condition_value'),
  onTrueStepId: uuid('on_true_step_id'), // Next step if condition is true
  onFalseStepId: uuid('on_false_step_id'), // Next step if condition is false

  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('workflow_steps_workflow_idx').on(table.workflowId),
  index('workflow_steps_order_idx').on(table.workflowId, table.stepOrder),
]);

/**
 * Workflow Executions - Track individual workflow runs
 */
export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull(), // FK to workflows
  companyId: text('company_id').notNull(),

  // What triggered this execution
  triggerType: workflowTriggerTypeEnum('trigger_type').notNull(),
  triggerData: jsonb('trigger_data'), // Data that triggered the workflow

  // Entity context
  entityType: text('entity_type'), // 'lead', 'client', 'proposal', etc.
  entityId: text('entity_id'),

  // Execution state
  status: workflowExecutionStatusEnum('status').default('running'),
  currentStepId: uuid('current_step_id'), // Current step being executed
  currentStepIndex: integer('current_step_index').default(0),

  // For waiting executions
  nextResumeAt: timestamp('next_resume_at'), // When to resume after wait

  // Execution data
  executionData: jsonb('execution_data'), // Data accumulated during execution
  error: text('error'),

  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('workflow_executions_workflow_idx').on(table.workflowId),
  index('workflow_executions_company_idx').on(table.companyId),
  index('workflow_executions_status_idx').on(table.status),
  index('workflow_executions_next_resume_idx').on(table.nextResumeAt),
  index('workflow_executions_entity_idx').on(table.entityType, table.entityId),
]);

/**
 * Workflow Execution Logs - Step-by-step audit log
 */
export const workflowExecutionLogs = pgTable('workflow_execution_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  executionId: uuid('execution_id').notNull(), // FK to workflow_executions
  stepId: uuid('step_id'), // FK to workflow_steps
  stepType: workflowStepTypeEnum('step_type'),
  stepName: text('step_name'),

  // Log entry
  status: text('status').notNull(), // 'started', 'completed', 'failed', 'skipped'
  message: text('message'),
  inputData: jsonb('input_data'),
  outputData: jsonb('output_data'),
  error: text('error'),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('workflow_execution_logs_execution_idx').on(table.executionId),
  index('workflow_execution_logs_step_idx').on(table.stepId),
]);

/**
 * Pre-built workflow templates
 */
export const WORKFLOW_TEMPLATES = [
  {
    name: 'New Lead Follow-Up',
    description: 'Automatically send follow-up emails to new leads',
    triggerType: 'lead_stage_change' as const,
    steps: [
      { stepType: 'wait', name: 'Wait 1 day', waitDuration: 1440, waitUnit: 'minutes' },
      { stepType: 'send_email', name: 'Send follow-up email', config: { subject: 'Following up on your inquiry' } },
      { stepType: 'wait', name: 'Wait 3 days', waitDuration: 4320, waitUnit: 'minutes' },
      { stepType: 'create_task', name: 'Create follow-up task', config: { title: 'Follow up with lead' } },
    ],
  },
  {
    name: 'Payment Reminder',
    description: 'Send reminders for overdue payments',
    triggerType: 'payment_overdue' as const,
    steps: [
      { stepType: 'send_email', name: 'Send reminder email', config: { subject: 'Payment Reminder' } },
      { stepType: 'wait', name: 'Wait 7 days', waitDuration: 10080, waitUnit: 'minutes' },
      { stepType: 'send_sms', name: 'Send SMS reminder', config: { message: 'Payment is overdue' } },
    ],
  },
  {
    name: 'RSVP Thank You',
    description: 'Send thank you message when guest RSVPs',
    triggerType: 'rsvp_received' as const,
    steps: [
      { stepType: 'send_email', name: 'Send thank you email', config: { subject: 'Thank you for your RSVP!' } },
    ],
  },
  {
    name: 'Wedding Countdown',
    description: 'Send countdown reminders before wedding',
    triggerType: 'event_date_approaching' as const,
    steps: [
      { stepType: 'condition', name: 'Check 30 days before', conditionType: 'days_before', conditionValue: '30' },
      { stepType: 'send_email', name: 'Send 30-day reminder', config: { subject: '30 Days Until Your Big Day!' } },
      { stepType: 'condition', name: 'Check 7 days before', conditionType: 'days_before', conditionValue: '7' },
      { stepType: 'send_email', name: 'Send 7-day reminder', config: { subject: 'One Week to Go!' } },
      { stepType: 'condition', name: 'Check 1 day before', conditionType: 'days_before', conditionValue: '1' },
      { stepType: 'send_email', name: 'Send final reminder', config: { subject: 'Tomorrow is the Big Day!' } },
    ],
  },
  {
    name: 'Proposal Follow-Up',
    description: 'Follow up on sent proposals',
    triggerType: 'proposal_accepted' as const,
    steps: [
      { stepType: 'send_email', name: 'Send congratulations email', config: { subject: 'Welcome! Let\'s Plan Your Dream Wedding' } },
      { stepType: 'create_task', name: 'Create onboarding task', config: { title: 'Complete client onboarding' } },
    ],
  },
];
