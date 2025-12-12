-- Migration: Brand Knowledge Vector Store

CREATE TABLE IF NOT EXISTS brand_knowledge_vectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  source_id VARCHAR(255),
  content TEXT NOT NULL,
  summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_brand_knowledge_vectors_brand
  ON brand_knowledge_vectors(brand_id);

CREATE INDEX IF NOT EXISTS idx_brand_knowledge_vectors_source
  ON brand_knowledge_vectors(brand_id, source_type);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_brand_knowledge_vectors_source
  ON brand_knowledge_vectors(brand_id, source_type, source_id)
  WHERE source_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_brand_knowledge_vectors_updated_at ON brand_knowledge_vectors;
CREATE TRIGGER update_brand_knowledge_vectors_updated_at
  BEFORE UPDATE ON brand_knowledge_vectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
