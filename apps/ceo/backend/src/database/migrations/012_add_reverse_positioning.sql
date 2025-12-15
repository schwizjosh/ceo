-- Migration: Add reverse_positioning field to brands table
-- Date: 2025-01-12

ALTER TABLE brands
ADD COLUMN IF NOT EXISTS reverse_positioning BOOLEAN DEFAULT false;

COMMENT ON COLUMN brands.reverse_positioning IS 'When true, audience research comes first - AI uses perfect buyer profile to inform all other brand positioning';
