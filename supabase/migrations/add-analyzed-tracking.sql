-- Add tracking column to know which events have been analyzed for risk alerts
-- This allows us to run catch-up analysis without re-analyzing events

ALTER TABLE external_events
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE;

-- Create an index for faster queries on unanalyzed events
CREATE INDEX IF NOT EXISTS idx_external_events_analyzed_at
ON external_events(analyzed_at)
WHERE analyzed_at IS NULL;

-- Add a comment for documentation
COMMENT ON COLUMN external_events.analyzed_at IS 'Timestamp when this event was analyzed by Claude AI for risk relevance. NULL means not yet analyzed.';
