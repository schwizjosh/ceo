-- Fix persona and buyer_profile fields
-- Migration: 004_fix_persona_buyer_profile.sql
--
-- Issues fixed:
-- 1. personality column is VARCHAR(50) but needs to store up to 1000 chars
-- 2. buyer_profile column is missing entirely

-- Change personality from VARCHAR(50) to TEXT to support larger persona descriptions
ALTER TABLE brands
  ALTER COLUMN personality TYPE TEXT;

-- Add buyer_profile column
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS buyer_profile TEXT;

-- Comment explaining the fields
COMMENT ON COLUMN brands.personality IS 'Brand voice and personality (up to 1000 chars) - maps to frontend "persona" field';
COMMENT ON COLUMN brands.buyer_profile IS 'Ideal customer profile description (up to 1000 chars)';
