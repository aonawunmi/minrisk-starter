-- Add risk title and description to alerts for better context
-- Run this in Supabase SQL Editor

ALTER TABLE risk_intelligence_alerts
ADD COLUMN IF NOT EXISTS risk_title TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS risk_description TEXT DEFAULT '';

-- Update existing alerts to populate risk details from risks table
UPDATE risk_intelligence_alerts a
SET
  risk_title = r.risk_title,
  risk_description = r.risk_description
FROM risks r
WHERE a.risk_code = r.risk_code
  AND a.organization_id = r.organization_id
  AND (a.risk_title IS NULL OR a.risk_title = '');

-- Verify the update
SELECT
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE risk_title IS NOT NULL AND risk_title != '') as alerts_with_title,
  COUNT(*) FILTER (WHERE risk_description IS NOT NULL AND risk_description != '') as alerts_with_description
FROM risk_intelligence_alerts;
