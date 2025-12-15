-- Add missing brand fields to support complete brand configuration
-- Migration: 002_add_brand_fields.sql

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS about TEXT,
  ADD COLUMN IF NOT EXISTS vision TEXT,
  ADD COLUMN IF NOT EXISTS mission TEXT,
  ADD COLUMN IF NOT EXISTS products TEXT,
  ADD COLUMN IF NOT EXISTS colors VARCHAR(255),
  ADD COLUMN IF NOT EXISTS brand_hq_location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS posting_frequency INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS preferred_posting_days JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS narrative_problem TEXT,
  ADD COLUMN IF NOT EXISTS narrative_solution TEXT,
  ADD COLUMN IF NOT EXISTS narrative_cta TEXT,
  ADD COLUMN IF NOT EXISTS narrative_failure TEXT,
  ADD COLUMN IF NOT EXISTS narrative_success TEXT;

-- Update existing brands to have default timezone if null
UPDATE brands SET timezone = 'UTC' WHERE timezone IS NULL;

-- Create index on timezone for faster queries
CREATE INDEX IF NOT EXISTS idx_brands_timezone ON brands(timezone);
