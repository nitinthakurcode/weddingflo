import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, index } from 'drizzle-orm/pg-core';
import { user } from './schema';
import { clients } from './schema-features';

/**
 * Chatbot Schema
 *
 * February 2026 - AI Chatbot Conversation Persistence
 *
 * Tables:
 * - chatbotConversations: Conversation sessions
 * - chatbotMessages: Individual messages
 * - chatbotCommandTemplates: User-customizable quick commands
 */

// ============================================
// CHATBOT CONVERSATIONS
// ============================================

export const chatbotConversations = pgTable('chatbot_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  clientId: text('client_id').references(() => clients.id, { onDelete: 'set null' }),
  companyId: text('company_id').notNull(),
  title: text('title'),
  summary: text('summary'),
  messageCount: integer('message_count').default(0),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_chatbot_conv_user').on(table.userId),
  index('idx_chatbot_conv_user_company').on(table.userId, table.companyId),
  index('idx_chatbot_conv_updated').on(table.userId, table.updatedAt),
]);

// ============================================
// CHATBOT MESSAGES
// ============================================

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type MessageStatus = 'pending' | 'streaming' | 'success' | 'error';

export const chatbotMessages = pgTable('chatbot_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => chatbotConversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull().$type<MessageRole>(),
  content: text('content').notNull(),
  toolName: text('tool_name'),
  toolArgs: jsonb('tool_args').$type<Record<string, unknown>>(),
  toolResult: jsonb('tool_result').$type<Record<string, unknown>>(),
  status: text('status').default('success').$type<MessageStatus>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_chatbot_msg_conv').on(table.conversationId),
  index('idx_chatbot_msg_created').on(table.conversationId, table.createdAt),
]);

// ============================================
// CHATBOT COMMAND TEMPLATES
// ============================================

export type TemplateCategory = 'custom' | 'guests' | 'budget' | 'events' | 'vendors' | 'timeline' | 'workflow';

export const chatbotCommandTemplates = pgTable('chatbot_command_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  companyId: text('company_id').notNull(),
  name: text('name').notNull(),
  command: text('command').notNull(),
  description: text('description'),
  icon: text('icon'),
  category: text('category').default('custom').$type<TemplateCategory>(),
  usageCount: integer('usage_count').default(0),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  isPinned: boolean('is_pinned').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_chatbot_templates_user').on(table.userId),
  index('idx_chatbot_templates_user_company').on(table.userId, table.companyId),
  index('idx_chatbot_templates_pinned').on(table.userId, table.isPinned, table.usageCount),
]);

// ============================================
// CHATBOT PENDING TOOL CALLS (UNLOGGED for performance)
// ============================================

/**
 * Pending Tool Calls - UNLOGGED Table
 *
 * February 2026 - PostgreSQL UNLOGGED table for temporary chatbot tool confirmations
 *
 * Why UNLOGGED:
 * - 2x faster writes than logged tables (0.03ms vs 0.24ms per query)
 * - No WAL overhead for ephemeral data (5 min TTL)
 * - Acceptable durability trade-off: data loss on crash is fine for confirmations
 * - Survives clean server restarts, only lost on unexpected crashes
 *
 * Source: https://dizzy.zone/2025/09/24/Redis-is-fast-Ill-cache-in-Postgres/
 *
 * Note: This table is created as UNLOGGED via migration SQL, not Drizzle schema
 * because Drizzle doesn't support UNLOGGED keyword directly.
 */
/**
 * Preview field type - matches ToolPreview interface from tool-executor.ts
 */
export interface DbToolPreview {
  toolName: string;
  action: string;
  description: string;
  fields: Array<{
    name: string;
    value: string | number | boolean | null;
    displayValue: string;
  }>;
  cascadeEffects: string[];
  warnings: string[];
  requiresConfirmation: boolean;
}

export const chatbotPendingCalls = pgTable('chatbot_pending_calls', {
  id: text('id').primaryKey(), // UUID passed from caller
  userId: text('user_id').notNull(),
  companyId: text('company_id').notNull(),
  toolName: text('tool_name').notNull(),
  args: jsonb('args').$type<Record<string, unknown>>().notNull(),
  preview: jsonb('preview').$type<DbToolPreview>().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_pending_calls_user').on(table.userId),
  index('idx_pending_calls_expires').on(table.expiresAt),
]);

// ============================================
// TYPES
// ============================================

export type ChatbotConversation = typeof chatbotConversations.$inferSelect;
export type NewChatbotConversation = typeof chatbotConversations.$inferInsert;

export type ChatbotMessage = typeof chatbotMessages.$inferSelect;
export type NewChatbotMessage = typeof chatbotMessages.$inferInsert;

export type ChatbotCommandTemplate = typeof chatbotCommandTemplates.$inferSelect;
export type NewChatbotCommandTemplate = typeof chatbotCommandTemplates.$inferInsert;

export type ChatbotPendingCall = typeof chatbotPendingCalls.$inferSelect;
export type NewChatbotPendingCall = typeof chatbotPendingCalls.$inferInsert;
