-- =====================================================
-- Add Relevant Period Field to Risks Table
-- Phase 2A - Time Period Features
-- =====================================================

-- Add relevant_period column to risks table
ALTER TABLE risks
ADD COLUMN relevant_period VARCHAR(50) DEFAULT NULL;

-- Add index for faster filtering
CREATE INDEX idx_risks_relevant_period ON risks(relevant_period);

-- Add comment for documentation
COMMENT ON COLUMN risks.relevant_period IS 'Time period when risk is relevant (e.g., Q1 2025, Q2 2025, FY2025)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'risks' AND column_name = 'relevant_period';

-- =====================================================
-- NOTES
-- =====================================================
-- This column is nullable to support existing risks
-- New risks should have this field populated
-- Format examples: Q1 2025, Q2 2025, Q3 2025, Q4 2025, FY2025, FY2026
-- The field allows flexible text entry for custom periods
-- =====================================================
