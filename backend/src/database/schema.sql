-- Andora Database Schema
-- Database: andora_db

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false
);

-- Brands Table
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  tagline TEXT,
  industry VARCHAR(100),
  target_audience TEXT,
  core_message TEXT,
  what_you_do TEXT,
  how_you_do_it TEXT,
  why_it_matters TEXT,
  personality VARCHAR(50), -- Friendly Expert, Calm Professional, etc.
  channels JSONB, -- Array of selected channels
  content_types JSONB, -- Array of selected content types (e.g., ["Graphic Design", "Blog Post", "Reel (Interview)"])
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Brand Characters (Cast) Table
CREATE TABLE IF NOT EXISTS brand_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  personality_tags JSONB, -- Array of personality traits
  role VARCHAR(100), -- e.g., "Creative Voice", "CEO Perspective"
  is_perfect BOOLEAN DEFAULT false, -- Locked from regeneration
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Brand Type (computed based on character count)
-- Solo Brand: 1 character
-- Ensemble Brand: 2+ characters

-- Content Calendar (for future use)
CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50), -- post, story, article, etc.
  platform VARCHAR(50),
  scheduled_date DATE,
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, published
  content_data JSONB, -- Flexible storage for content
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_brands_user_id ON brands(user_id);
CREATE INDEX idx_brand_characters_brand_id ON brand_characters(brand_id);
CREATE INDEX idx_content_calendar_brand_id ON content_calendar(brand_id);
CREATE INDEX idx_users_email ON users(email);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_characters_updated_at BEFORE UPDATE ON brand_characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_calendar_updated_at BEFORE UPDATE ON content_calendar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
