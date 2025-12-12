-- Migration: Add content_types column to brands table
-- Description: Allows brands to specify which content types they can produce (e.g., Graphic Design, Blog Post, Reel)

ALTER TABLE brands
ADD COLUMN IF NOT EXISTS content_types JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN brands.content_types IS 'Array of content types the brand is equipped to produce (e.g., ["Graphic Design", "Blog Post", "Reel (Interview)"])';
