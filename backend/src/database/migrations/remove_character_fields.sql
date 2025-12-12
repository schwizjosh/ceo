-- Remove unwanted character fields per user requirements
-- character_name: Removed - cinematic persona uses real name, not made-up character name
-- emotional_range: Removed - no longer needed
-- personality_tags: Removed - replaced with one-line personality field

ALTER TABLE brand_characters
DROP COLUMN IF EXISTS character_name,
DROP COLUMN IF EXISTS emotional_range,
DROP COLUMN IF EXISTS personality_tags;

-- Update comments for clarity
COMMENT ON COLUMN brand_characters.name IS 'The character''s dramatic role in the story (e.g., The Guardian, The Mother, The Keeper, The Royal)';
COMMENT ON COLUMN brand_characters.voice IS 'Character & Voice - captures the person''s character and voice in detail';
COMMENT ON COLUMN brand_characters.personality IS 'One-line personality description (can reference 16personalities.com types)';
