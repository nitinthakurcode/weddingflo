-- Add missing fields to messages table for chat functionality
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sender_type TEXT CHECK (sender_type IN ('company', 'client')),
  ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN messages.company_id IS 'Reference to the company (for multi-tenant support)';
COMMENT ON COLUMN messages.sender_type IS 'Type of sender: company (admin/planner) or client';
COMMENT ON COLUMN messages.sender_name IS 'Display name of the sender';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_company_id ON messages(company_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
