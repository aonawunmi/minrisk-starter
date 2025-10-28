-- Add treatment tracking fields to risk_intelligence_alerts
-- This allows tracking when accepted alerts are actually applied to the risk register

ALTER TABLE risk_intelligence_alerts
ADD COLUMN IF NOT EXISTS applied_to_risk BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS applied_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS treatment_notes TEXT;

-- Create index for faster querying of untreated accepted alerts
CREATE INDEX IF NOT EXISTS idx_alerts_accepted_not_applied
ON risk_intelligence_alerts(status, applied_to_risk)
WHERE status = 'accepted' AND applied_to_risk = FALSE;

-- Add comment for documentation
COMMENT ON COLUMN risk_intelligence_alerts.applied_to_risk IS 'Whether the accepted alert has been manually applied to the risk register';
COMMENT ON COLUMN risk_intelligence_alerts.applied_at IS 'When the alert was applied to the risk register';
COMMENT ON COLUMN risk_intelligence_alerts.applied_by IS 'User who applied the alert to the risk register';
COMMENT ON COLUMN risk_intelligence_alerts.treatment_notes IS 'Notes on how the alert was treated/applied';
