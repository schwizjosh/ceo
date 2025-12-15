-- Update brand_characters schema for dramatic storytelling
-- Migration: 003_update_character_schema.sql

-- Add new columns for the dramatic character format
ALTER TABLE brand_characters
  ADD COLUMN IF NOT EXISTS real_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS business_role VARCHAR(255),
  ADD COLUMN IF NOT EXISTS character_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS work_mode VARCHAR(20) DEFAULT 'on-site';

-- Migrate existing data to new format
-- Copy 'name' to 'character_name' if not null
UPDATE brand_characters
SET character_name = name
WHERE character_name IS NULL AND name IS NOT NULL;

-- Copy 'role' to 'business_role' if not null
UPDATE brand_characters
SET business_role = role
WHERE business_role IS NULL AND role IS NOT NULL;

-- Set default work_mode based on location
UPDATE brand_characters
SET work_mode = CASE
  WHEN location ILIKE '%remote%' THEN 'remote'
  ELSE 'on-site'
END
WHERE work_mode IS NULL;

-- Create index on work_mode for location-aware queries
CREATE INDEX IF NOT EXISTS idx_brand_characters_work_mode ON brand_characters(work_mode);

-- Create index on brand_id and work_mode for faster orchestration queries
CREATE INDEX IF NOT EXISTS idx_brand_characters_brand_work ON brand_characters(brand_id, work_mode);
