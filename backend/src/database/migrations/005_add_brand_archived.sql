-- Migration: Add archived_at field to brands table
-- This allows brands to be archived without deleting them

ALTER TABLE brands
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_brands_archived_at ON brands(archived_at);

-- Add comment to column
COMMENT ON COLUMN brands.archived_at IS 'Timestamp when the brand was archived. NULL means active.';
