-- Add embedded_in_subplot field to track which events have been incorporated into subplots
ALTER TABLE brand_events
ADD COLUMN IF NOT EXISTS embedded_in_subplot BOOLEAN DEFAULT FALSE;

-- Add last_embedded_at to track when it was last embedded
ALTER TABLE brand_events
ADD COLUMN IF NOT EXISTS last_embedded_at TIMESTAMP;

-- Add index for efficient querying of unembedded events
CREATE INDEX IF NOT EXISTS idx_brand_events_embedded
ON brand_events(brand_id, embedded_in_subplot, start_date);
