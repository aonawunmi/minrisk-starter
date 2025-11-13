-- Safe migration: Create risk_history table with correct RLS policies

-- Drop existing objects if they exist
DROP INDEX IF EXISTS idx_risk_history_period;
DROP INDEX IF EXISTS idx_risk_history_org_period;
DROP INDEX IF EXISTS idx_risk_history_archived_at;
DROP POLICY IF EXISTS "Users can view risk_history for their organization" ON risk_history;
DROP POLICY IF EXISTS "Admins can insert risk_history" ON risk_history;
DROP POLICY IF EXISTS "Admins can delete risk_history" ON risk_history;
DROP POLICY IF EXISTS "View risk_history policy" ON risk_history;
DROP POLICY IF EXISTS "Insert risk_history policy" ON risk_history;
DROP POLICY IF EXISTS "Delete risk_history policy" ON risk_history;
DROP POLICY IF EXISTS "allow_own_risk_history_select" ON risk_history;
DROP TABLE IF EXISTS risk_history;

-- Create risk_history table for archived risks
CREATE TABLE risk_history (
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

-- RLS Policy: Users can view their own risk history
CREATE POLICY "allow_own_risk_history_select"
ON risk_history
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policy: Admins can view all risk history in their organization
CREATE POLICY "View risk_history policy"
ON risk_history
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.status = 'approved'
        AND (
            user_profiles.role = 'admin'
            OR risk_history.user_id = auth.uid()
        )
    )
);

-- RLS Policy: Admins can insert risk history (for archiving)
CREATE POLICY "Insert risk_history policy"
ON risk_history
FOR INSERT
TO public
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
        AND user_profiles.status = 'approved'
    )
);

-- RLS Policy: Admins can delete risk history
CREATE POLICY "Delete risk_history policy"
ON risk_history
FOR DELETE
TO public
USING (
    EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
        AND user_profiles.status = 'approved'
    )
);

-- Add helpful comments
COMMENT ON TABLE risk_history IS 'Stores archived risks from previous periods for historical reporting and trend analysis';
COMMENT ON COLUMN risk_history.period IS 'Reporting period (e.g., Q1 2025, Q4 2024) - critical for period-specific reports';
COMMENT ON COLUMN risk_history.original_risk_id IS 'References the original risk ID before archiving';

-- Verify table was created
SELECT 'risk_history table created successfully!' as status,
       COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'risk_history';
