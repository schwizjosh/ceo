-- Migration 003: Add narrative_why field to brands table
-- This completes the 6 narrative elements: why, problem, solution, cta, failure, success

ALTER TABLE brands
ADD COLUMN IF NOT EXISTS narrative_why TEXT;

-- Add comment for clarity
COMMENT ON COLUMN brands.narrative_why IS 'The Why (Story Purpose) - The deeper purpose driving the brand story';
