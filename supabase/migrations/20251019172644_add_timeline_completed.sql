-- Add completed column to timeline table
ALTER TABLE timeline
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN timeline.completed IS 'Whether the timeline item has been completed';

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_timeline_completed ON timeline(completed);
