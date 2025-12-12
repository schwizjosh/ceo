-- Migration: Add Events & Milestones + Seasons Planner tables
-- Date: January 2025

-- Events & Milestones Table
CREATE TABLE IF NOT EXISTS brand_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- Launch, Campaign, Holiday, Trend, Custom
  start_date DATE NOT NULL,
  end_date DATE, -- NULL for single-day events
  description TEXT,
  relevance_tag VARCHAR(50), -- Internal, Industry, Social, Cultural
  remind_andora BOOLEAN DEFAULT true, -- Include in AI content generation
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seasons (Quarterly themes) Table
CREATE TABLE IF NOT EXISTS brand_seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  quarter INTEGER NOT NULL, -- 1, 2, 3, 4
  year INTEGER NOT NULL,
  theme VARCHAR(255), -- e.g., "Growth Through Authenticity"
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(brand_id, quarter, year)
);

-- Monthly Themes Table
CREATE TABLE IF NOT EXISTS brand_monthly_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  season_id UUID REFERENCES brand_seasons(id) ON DELETE CASCADE,
  month INTEGER NOT NULL, -- 1-12
  year INTEGER NOT NULL,
  theme VARCHAR(255) NOT NULL, -- Monthly narrative theme
  description TEXT,
  is_finalized BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(brand_id, month, year)
);

-- Weekly Subplots Table
CREATE TABLE IF NOT EXISTS brand_weekly_subplots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monthly_theme_id UUID NOT NULL REFERENCES brand_monthly_themes(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL, -- 1-4
  subplot_title VARCHAR(255) NOT NULL,
  description TEXT,
  characters_involved JSONB, -- Array of character IDs
  related_events JSONB, -- Array of event IDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(monthly_theme_id, week_number)
);

-- Indexes for performance
CREATE INDEX idx_brand_events_brand_id ON brand_events(brand_id);
CREATE INDEX idx_brand_events_dates ON brand_events(start_date, end_date);
CREATE INDEX idx_brand_seasons_brand_id ON brand_seasons(brand_id);
CREATE INDEX idx_brand_monthly_themes_brand_id ON brand_monthly_themes(brand_id);
CREATE INDEX idx_brand_monthly_themes_season_id ON brand_monthly_themes(season_id);
CREATE INDEX idx_brand_weekly_subplots_monthly_theme_id ON brand_weekly_subplots(monthly_theme_id);

-- Apply update triggers
CREATE TRIGGER update_brand_events_updated_at BEFORE UPDATE ON brand_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_seasons_updated_at BEFORE UPDATE ON brand_seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_monthly_themes_updated_at BEFORE UPDATE ON brand_monthly_themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_weekly_subplots_updated_at BEFORE UPDATE ON brand_weekly_subplots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE brand_events IS 'Stores brand events, milestones, launches, and campaigns';
COMMENT ON TABLE brand_seasons IS 'Quarterly narrative themes for brand storytelling';
COMMENT ON TABLE brand_monthly_themes IS 'Monthly themes that guide content creation';
COMMENT ON TABLE brand_weekly_subplots IS 'Weekly story arcs within monthly themes';
