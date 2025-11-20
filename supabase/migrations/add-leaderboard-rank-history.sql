-- Add rank history tracking to player_stats for accurate trend calculation
-- This replaces random trend generation with actual rank changes

-- Add previous_rank column to track rank changes
ALTER TABLE player_stats 
ADD COLUMN IF NOT EXISTS previous_rank INTEGER,
ADD COLUMN IF NOT EXISTS rank_updated_at TIMESTAMPTZ;

-- Create index for efficient rank queries (using xp column, not total_xp)
CREATE INDEX IF NOT EXISTS idx_player_stats_xp ON player_stats(xp DESC);

-- Function to update ranks and track changes
CREATE OR REPLACE FUNCTION update_player_ranks()
RETURNS void AS $$
BEGIN
  -- Update previous_rank with current rank before recalculating
  -- Rank is based on xp (higher xp = better rank = lower rank number)
  UPDATE player_stats ps
  SET previous_rank = (
    SELECT COUNT(*) + 1
    FROM player_stats ps2
    WHERE ps2.xp > ps.xp
  );
  
  -- Update rank_updated_at timestamp
  UPDATE player_stats
  SET rank_updated_at = NOW()
  WHERE previous_rank IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- You can call this function periodically (e.g., via cron job) to update ranks
-- Or call it after XP updates to keep ranks current

