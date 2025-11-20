-- Create rate_limits table for persistent rate limiting
-- This replaces in-memory rate limiting which resets on serverless cold starts

CREATE TABLE IF NOT EXISTS rate_limits (
  identifier TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_time TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient cleanup of expired records
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_time ON rate_limits(reset_time);

-- Optional: Add RLS policies if needed (usually not needed for rate limiting)
-- ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

