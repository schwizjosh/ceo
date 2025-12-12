-- Migration: Create brand_token_usage table
-- Date: 2025-02-??

CREATE TABLE IF NOT EXISTS brand_token_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  task_type VARCHAR(100) NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(brand_id, usage_date, task_type)
);

CREATE INDEX IF NOT EXISTS idx_brand_token_usage_brand_date
  ON brand_token_usage(brand_id, usage_date);

CREATE INDEX IF NOT EXISTS idx_brand_token_usage_task
  ON brand_token_usage(task_type);

CREATE TRIGGER update_brand_token_usage_updated_at
  BEFORE UPDATE ON brand_token_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
