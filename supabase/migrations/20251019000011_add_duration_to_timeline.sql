-- Add duration_minutes column to timeline table
ALTER TABLE timeline
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN timeline.duration_minutes IS 'Duration of the timeline event in minutes';
