-- Migration: Storytelling Continuity Upgrades
-- Adds brand archetype metadata, subplot next-scene hooks, and character relationship graph

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS brand_archetype VARCHAR(120);

ALTER TABLE brand_weekly_subplots
  ADD COLUMN IF NOT EXISTS next_scene_hooks JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS brand_character_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  source_character_id UUID NOT NULL REFERENCES brand_characters(id) ON DELETE CASCADE,
  target_character_id UUID NOT NULL REFERENCES brand_characters(id) ON DELETE CASCADE,
  relationship_type VARCHAR(30) NOT NULL DEFAULT 'ally',
  summary TEXT,
  tension_level INTEGER DEFAULT 0,
  collaboration_strength INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (brand_id, source_character_id, target_character_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_brand_character_relationships_brand_id
  ON brand_character_relationships(brand_id);

CREATE INDEX IF NOT EXISTS idx_brand_character_relationships_source_target
  ON brand_character_relationships(source_character_id, target_character_id);

DROP TRIGGER IF EXISTS update_brand_character_relationships_updated_at ON brand_character_relationships;
CREATE TRIGGER update_brand_character_relationships_updated_at
  BEFORE UPDATE ON brand_character_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
