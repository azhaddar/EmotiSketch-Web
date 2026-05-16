-- Add htp_features column to sketches table
-- Stores structured clinical observations from HTP/DAP analysis
ALTER TABLE sketches
  ADD COLUMN IF NOT EXISTS htp_features JSONB DEFAULT NULL;

-- Index for querying sketches that have HTP features
CREATE INDEX IF NOT EXISTS idx_sketches_htp_features
  ON sketches USING GIN (htp_features)
  WHERE htp_features IS NOT NULL;
