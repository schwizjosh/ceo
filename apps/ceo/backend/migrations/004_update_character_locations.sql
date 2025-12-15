-- Migration 004: Expand character location types
-- Add 'hybrid' location type to support the Andora Storytelling Framework

-- Update location field comment to reflect new types
COMMENT ON COLUMN brand_characters.location IS 'Character location: onsite (physical office), remote (works from home), hybrid (both onsite and remote)';

-- Note: PostgreSQL allows any TEXT value, so no constraint changes needed
-- But we document the expected values:
-- - 'onsite' (physical office/location)
-- - 'remote' (works from home/virtual)
-- - 'hybrid' (both - can bridge onsite and remote)
