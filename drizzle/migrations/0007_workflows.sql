-- Workflows Migration
-- February 2026 - Workflow automation system for WeddingFlo

-- Create enums
DO $$ BEGIN
  CREATE TYPE workflow_trigger_type AS ENUM (
    'lead_stage_change',
    'client_created',
    'event_date_approaching',
    'payment_overdue',
    'rsvp_received',
    'proposal_accepted',
    'contract_signed',
    'scheduled',
    'manual'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_step_type AS ENUM (
    'send_email',
    'send_sms',
    'send_whatsapp',
    'wait',
    'condition',
    'create_task',
    'update_lead',
    'update_client',
    'create_notification',
    'webhook'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_execution_status AS ENUM (
    'running',
    'waiting',
    'completed',
    'failed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type workflow_trigger_type NOT NULL,
  trigger_config JSONB,
  cron_expression TEXT,
  timezone TEXT DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  is_template BOOLEAN DEFAULT false,
  metadata JSONB,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Steps table
CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_type workflow_step_type NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 0,
  name TEXT,
  config JSONB,
  wait_duration INTEGER,
  wait_unit TEXT DEFAULT 'minutes',
  condition_type TEXT,
  condition_field TEXT,
  condition_operator TEXT,
  condition_value TEXT,
  on_true_step_id UUID,
  on_false_step_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  trigger_type workflow_trigger_type NOT NULL,
  trigger_data JSONB,
  entity_type TEXT,
  entity_id TEXT,
  status workflow_execution_status DEFAULT 'running',
  current_step_id UUID,
  current_step_index INTEGER DEFAULT 0,
  next_resume_at TIMESTAMP,
  execution_data JSONB,
  error TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Execution Logs table
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_id UUID,
  step_type workflow_step_type,
  step_name TEXT,
  status TEXT NOT NULL,
  message TEXT,
  input_data JSONB,
  output_data JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for workflows
CREATE INDEX IF NOT EXISTS workflows_company_idx ON workflows(company_id);
CREATE INDEX IF NOT EXISTS workflows_trigger_type_idx ON workflows(trigger_type);
CREATE INDEX IF NOT EXISTS workflows_is_active_idx ON workflows(is_active);

-- Indexes for workflow_steps
CREATE INDEX IF NOT EXISTS workflow_steps_workflow_idx ON workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_steps_order_idx ON workflow_steps(workflow_id, step_order);

-- Indexes for workflow_executions
CREATE INDEX IF NOT EXISTS workflow_executions_workflow_idx ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_executions_company_idx ON workflow_executions(company_id);
CREATE INDEX IF NOT EXISTS workflow_executions_status_idx ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS workflow_executions_next_resume_idx ON workflow_executions(next_resume_at)
  WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS workflow_executions_entity_idx ON workflow_executions(entity_type, entity_id);

-- Indexes for workflow_execution_logs
CREATE INDEX IF NOT EXISTS workflow_execution_logs_execution_idx ON workflow_execution_logs(execution_id);
CREATE INDEX IF NOT EXISTS workflow_execution_logs_step_idx ON workflow_execution_logs(step_id);
