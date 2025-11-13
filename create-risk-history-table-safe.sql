-- Safe migration: Create risk_history table (handles existing objects)

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_risk_history_period;
DROP INDEX IF EXISTS idx_risk_history_org_period;
DROP INDEX IF EXISTS idx_risk_history_archived_at;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view risk_history for their organization" ON risk_history;
DROP POLICY IF EXISTS "Admins can insert risk_history" ON risk_history;
DROP POLICY IF EXISTS "Admins can delete risk_history" ON risk_history;

-- Drop existing table if it exists (CAUTION: This will delete any existing data)
-- Comment out the line below if you want to preserve existing data
DROP TABLE IF EXISTS risk_history;

-- Create risk_history table for archived risks
CREATE TABLE IF NOT EXISTS risk_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    risk_code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    subcategory TEXT,
    owner TEXT,
    status TEXT CHECK (status IN ('Open', 'In Progress', 'Mitigated', 'Closed', 'Accepted')),

    -- Inherent risk scores
    likelihood_inherent INTEGER CHECK (likelihood_inherent >= 1 AND likelihood_inherent <= 5),
    impact_inherent INTEGER CHECK (impact_inherent >= 1 AND impact_inherent <= 5),
    score_inherent INTEGER,
    rating_inherent TEXT,

    -- Residual risk scores
    likelihood_residual INTEGER,
    impact_residual INTEGER,
    score_residual INTEGER,
    rating_residual TEXT,

    -- Risk appetite
    risk_appetite_threshold INTEGER,
    risk_appetite_status TEXT CHECK (risk_appetite_status IN ('Within', 'Exceeds')),

    -- Period tracking (critical for reporting)
    period TEXT NOT NULL,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_by UUID REFERENCES auth.users(id),

    -- Original risk ID (to track which active risk this came from)
    original_risk_id UUID
);

-- Create indexes for fast period-based queries
CREATE INDEX idx_risk_history_period ON risk_history(period);
CREATE INDEX idx_risk_history_org_period ON risk_history(organization_id, period);
CREATE INDEX idx_risk_history_archived_at ON risk_history(archived_at);

-- Enable RLS
ALTER TABLE risk_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view risk_history for their organization"
ON risk_history
FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id
        FROM user_roles
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can insert risk_history"
ON risk_history
FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT organization_id
        FROM user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can delete risk_history"
ON risk_history
FOR DELETE
USING (
    organization_id IN (
        SELECT organization_id
        FROM user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Add helpful comments
COMMENT ON TABLE risk_history IS 'Stores archived risks from previous periods for historical reporting and trend analysis';
COMMENT ON COLUMN risk_history.period IS 'Reporting period (e.g., Q1 2025, Q4 2024) - critical for period-specific reports';
COMMENT ON COLUMN risk_history.original_risk_id IS 'References the original risk ID before archiving';

-- Verify table was created
SELECT 'risk_history table created successfully!' as status;
