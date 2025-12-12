-- Migration: Add gender field to brand_characters table
-- This helps Andora use correct pronouns and create more personalized content

-- Add gender column to brand_characters
ALTER TABLE brand_characters
ADD COLUMN IF NOT EXISTS gender VARCHAR(50);

-- Add comment explaining the field
COMMENT ON COLUMN brand_characters.gender IS 'Gender of the character - helps Andora use correct pronouns (Male, Female, Non-binary, Prefer not to say)';
