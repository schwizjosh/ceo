-- Add expanded_brief_state column to content_calendar table
-- This stores whether the brief is expanded or collapsed in the UI

ALTER TABLE content_calendar
ADD COLUMN IF NOT EXISTS is_expanded BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_content_calendar_is_expanded
ON content_calendar(brand_id, scheduled_date, is_expanded);

-- Comment for documentation
COMMENT ON COLUMN content_calendar.is_expanded IS 'Whether the content brief is expanded in the UI (persisted state)';
