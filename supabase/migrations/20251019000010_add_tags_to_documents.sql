-- Add tags column to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN documents.tags IS 'Tags for categorizing and searching documents';
