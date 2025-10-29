-- Add scanner configuration to app_configs table
-- This allows organizations to configure their news scanning mode and AI confidence threshold

-- Add scanner_mode column: 'ai' for Claude AI analysis, 'keyword' for keyword matching only
ALTER TABLE app_configs
ADD COLUMN IF NOT EXISTS scanner_mode TEXT DEFAULT 'ai' CHECK (scanner_mode IN ('ai', 'keyword'));

-- Add scanner_confidence_threshold for AI mode (0.0 to 1.0, default 0.6)
-- Lower values = more lenient (catches more events), higher values = more restrictive (only high-confidence events)
ALTER TABLE app_configs
ADD COLUMN IF NOT EXISTS scanner_confidence_threshold NUMERIC DEFAULT 0.6 CHECK (scanner_confidence_threshold >= 0.0 AND scanner_confidence_threshold <= 1.0);

-- Add comment explaining the fields
COMMENT ON COLUMN app_configs.scanner_mode IS 'News scanning mode: "ai" for Claude AI analysis with confidence scoring, "keyword" for simple keyword matching';
COMMENT ON COLUMN app_configs.scanner_confidence_threshold IS 'AI confidence threshold (0.0-1.0). Lower = more lenient, higher = more restrictive. Only used when scanner_mode is "ai"';
