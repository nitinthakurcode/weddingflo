-- Create creative_jobs table for tracking creative deliverables
CREATE TABLE IF NOT EXISTS creative_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('video', 'photo', 'graphic', 'invitation', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'in_progress', 'review', 'approved', 'completed')),
  assigned_to TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE creative_jobs IS 'Tracks creative deliverables like videos, photos, graphics, and invitations for wedding planning';
COMMENT ON COLUMN creative_jobs.job_type IS 'Type of creative work: video, photo, graphic, invitation, other';
COMMENT ON COLUMN creative_jobs.status IS 'Current status: requested, in_progress, review, approved, completed';
COMMENT ON COLUMN creative_jobs.priority IS 'Priority level: low, medium, high';
COMMENT ON COLUMN creative_jobs.file_url IS 'URL to the deliverable file (storage link)';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_creative_jobs_client_id ON creative_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_creative_jobs_status ON creative_jobs(status);
CREATE INDEX IF NOT EXISTS idx_creative_jobs_due_date ON creative_jobs(due_date);
CREATE INDEX IF NOT EXISTS idx_creative_jobs_priority ON creative_jobs(priority);

-- Enable Row Level Security
ALTER TABLE creative_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view creative_jobs for clients in their company
CREATE POLICY "users_view_company_creative_jobs"
  ON creative_jobs
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = (SELECT get_current_user_company_id())
    )
  );

-- RLS Policy: Users can insert creative_jobs for their company's clients
CREATE POLICY "users_insert_company_creative_jobs"
  ON creative_jobs
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = (SELECT get_current_user_company_id())
    )
  );

-- RLS Policy: Users can update creative_jobs in their company
CREATE POLICY "users_update_company_creative_jobs"
  ON creative_jobs
  FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = (SELECT get_current_user_company_id())
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = (SELECT get_current_user_company_id())
    )
  );

-- RLS Policy: Users can delete creative_jobs in their company
CREATE POLICY "users_delete_company_creative_jobs"
  ON creative_jobs
  FOR DELETE
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = (SELECT get_current_user_company_id())
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_creative_jobs_updated_at
  BEFORE UPDATE ON creative_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
