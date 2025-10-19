-- Add remaining timeline fields that were in the UI
ALTER TABLE timeline
ADD COLUMN IF NOT EXISTS responsible_person TEXT;

ALTER TABLE timeline
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN timeline.responsible_person IS 'Person responsible for this timeline item';
COMMENT ON COLUMN timeline.sort_order IS 'Order of timeline items for display';

-- Add index for sorting
CREATE INDEX IF NOT EXISTS idx_timeline_sort_order ON timeline(sort_order);
