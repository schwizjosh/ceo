-- Migration: Add is_muted field to brand_characters table
-- Purpose: Allow characters to be "muted" (hidden from story engine but kept in list)
-- Date: 2025-01-14

-- Add is_muted column (defaults to false - not muted)
ALTER TABLE brand_characters
ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false;

-- Add index for filtering muted characters
CREATE INDEX IF NOT EXISTS idx_brand_characters_is_muted ON brand_characters(brand_id, is_muted);

-- Add comment to document the field
COMMENT ON COLUMN brand_characters.is_muted IS 'When true, character is hidden from story engine but remains in character list';
