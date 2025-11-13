-- Fix risk_history table to use 'relevant_period' instead of 'period'
-- This matches the column name in the risks table

ALTER TABLE risk_history
RENAME COLUMN period TO relevant_period;

-- Update the comment
COMMENT ON COLUMN risk_history.relevant_period IS 'Reporting period (e.g., Q1 2025, Q4 2024) - critical for period-specific reports';

-- Recreate the indexes with the correct column name
DROP INDEX IF EXISTS idx_risk_history_period;
DROP INDEX IF EXISTS idx_risk_history_org_period;

CREATE INDEX idx_risk_history_relevant_period ON risk_history(relevant_period);
CREATE INDEX idx_risk_history_org_relevant_period ON risk_history(organization_id, relevant_period);

-- Verify the change
SELECT 'Column renamed successfully!' as status,
       column_name,
       data_type
FROM information_schema.columns
WHERE table_name = 'risk_history' AND column_name = 'relevant_period';
