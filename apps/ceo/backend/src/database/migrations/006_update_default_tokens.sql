-- Update default tokens to 10,000 for new users
-- This migration sets the default token value to 10,000 for trial users

-- Update the default value for the tokens column
ALTER TABLE users ALTER COLUMN tokens SET DEFAULT 10000;

-- Update existing users who still have the old default (100 tokens) to 10,000
-- Only update free plan users who haven't used their tokens yet
UPDATE users
SET tokens = 10000
WHERE plan = 'free'
  AND tokens = 100;

-- Comment for documentation
COMMENT ON COLUMN users.tokens IS 'Token balance for AI operations. Default: 10,000 for free trial users.';
