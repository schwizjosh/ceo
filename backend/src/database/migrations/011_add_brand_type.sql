-- Migration: Add brand_type column to brands table
-- Date: 2025-01-12

ALTER TABLE brands
ADD COLUMN IF NOT EXISTS brand_type VARCHAR(20) DEFAULT 'organization';

-- Add comment explaining the field
COMMENT ON COLUMN brands.brand_type IS 'Type of brand: individual (personal brand, 1 character) or organization (company/team, multiple characters)';

-- Update existing brands to have default value
UPDATE brands
SET brand_type = 'organization'
WHERE brand_type IS NULL;
