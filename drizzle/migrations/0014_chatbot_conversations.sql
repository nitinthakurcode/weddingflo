-- Migration: 0014_chatbot_conversations
-- February 2026 - AI Chatbot Conversation Persistence
-- Features: Conversation history, message persistence, templates

-- ============================================
-- CHATBOT CONVERSATIONS TABLE
-- ============================================
-- Stores conversation sessions for the AI chatbot
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  company_id TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure company_id is not empty
  CONSTRAINT chatbot_conversations_company_check CHECK (company_id <> '')
);

-- ============================================
-- CHATBOT MESSAGES TABLE
-- ============================================
-- Stores individual messages within conversations
CREATE TABLE IF NOT EXISTS chatbot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_name TEXT,
  tool_args JSONB,
  tool_result JSONB,
  status TEXT DEFAULT 'success' CHECK (status IN ('pending', 'streaming', 'success', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure content is not empty
  CONSTRAINT chatbot_messages_content_check CHECK (content <> '')
);

-- ============================================
-- CHATBOT COMMAND TEMPLATES TABLE
-- ============================================
-- User-customizable command templates for quick actions
CREATE TABLE IF NOT EXISTS chatbot_command_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT DEFAULT 'custom',
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure name and command are not empty
  CONSTRAINT chatbot_templates_name_check CHECK (name <> ''),
  CONSTRAINT chatbot_templates_command_check CHECK (command <> '')
);

-- ============================================
-- INDEXES
-- ============================================

-- Conversations: lookup by user (most common query)
CREATE INDEX IF NOT EXISTS idx_chatbot_conv_user
  ON chatbot_conversations(user_id);

-- Conversations: lookup by user + company for multi-company users
CREATE INDEX IF NOT EXISTS idx_chatbot_conv_user_company
  ON chatbot_conversations(user_id, company_id);

-- Conversations: lookup by client (for client-specific history)
CREATE INDEX IF NOT EXISTS idx_chatbot_conv_client
  ON chatbot_conversations(client_id)
  WHERE client_id IS NOT NULL;

-- Conversations: ordering by recency
CREATE INDEX IF NOT EXISTS idx_chatbot_conv_updated
  ON chatbot_conversations(user_id, updated_at DESC);

-- Messages: lookup by conversation (most common)
CREATE INDEX IF NOT EXISTS idx_chatbot_msg_conv
  ON chatbot_messages(conversation_id);

-- Messages: ordering by time within conversation
CREATE INDEX IF NOT EXISTS idx_chatbot_msg_created
  ON chatbot_messages(conversation_id, created_at ASC);

-- Templates: lookup by user
CREATE INDEX IF NOT EXISTS idx_chatbot_templates_user
  ON chatbot_command_templates(user_id);

-- Templates: lookup by user + company for multi-company users
CREATE INDEX IF NOT EXISTS idx_chatbot_templates_user_company
  ON chatbot_command_templates(user_id, company_id);

-- Templates: pinned templates first, then by usage
CREATE INDEX IF NOT EXISTS idx_chatbot_templates_pinned
  ON chatbot_command_templates(user_id, is_pinned DESC, usage_count DESC);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE chatbot_conversations IS 'AI chatbot conversation sessions with history';
COMMENT ON TABLE chatbot_messages IS 'Individual messages within chatbot conversations';
COMMENT ON TABLE chatbot_command_templates IS 'User-customizable quick command templates';

COMMENT ON COLUMN chatbot_conversations.title IS 'Auto-generated or user-set conversation title';
COMMENT ON COLUMN chatbot_conversations.summary IS 'AI-generated summary of the conversation';
COMMENT ON COLUMN chatbot_conversations.message_count IS 'Cached count of messages for quick display';
COMMENT ON COLUMN chatbot_conversations.last_message_at IS 'Timestamp of most recent message';

COMMENT ON COLUMN chatbot_messages.role IS 'Message role: user, assistant, system, or tool';
COMMENT ON COLUMN chatbot_messages.tool_name IS 'Name of tool called (if role=tool or assistant called a tool)';
COMMENT ON COLUMN chatbot_messages.tool_args IS 'Arguments passed to the tool';
COMMENT ON COLUMN chatbot_messages.tool_result IS 'Result returned from tool execution';
COMMENT ON COLUMN chatbot_messages.status IS 'Message status: pending, streaming, success, error';

COMMENT ON COLUMN chatbot_command_templates.category IS 'Category for organization: custom, guests, budget, events, etc.';
COMMENT ON COLUMN chatbot_command_templates.usage_count IS 'Number of times this template has been used';
COMMENT ON COLUMN chatbot_command_templates.is_pinned IS 'If true, shows at top of quick actions';
