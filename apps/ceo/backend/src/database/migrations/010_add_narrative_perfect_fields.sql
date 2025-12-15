-- Migration: Add narrative_why and narrative_perfect_fields to brands table
-- This enables tracking which narrative fields are marked as "perfect" by users

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS narrative_why TEXT,
  ADD COLUMN IF NOT EXISTS narrative_perfect_fields JSONB DEFAULT '{}'::jsonb;

-- Create index for faster JSON queries on narrative_perfect_fields
CREATE INDEX IF NOT EXISTS idx_brands_narrative_perfect_fields
  ON brands USING gin(narrative_perfect_fields);

-- Add comment for documentation
COMMENT ON COLUMN brands.narrative_why IS 'Brand purpose - why the brand exists (narrative framework)';
COMMENT ON COLUMN brands.narrative_perfect_fields IS 'JSON object tracking which narrative fields are marked perfect by users (e.g., {"narrative_why": true, "narrative_problem": false})';
