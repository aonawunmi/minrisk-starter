-- =====================================================
-- ERM UPGRADE - PHASE 1: INCIDENTS MODULE
-- =====================================================
-- This migration creates the incidents table and related structures
-- for the Enterprise Risk Management (ERM) upgrade
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. CREATE INCIDENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Incident Identification
    incident_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Incident Details
    incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reported_by TEXT NOT NULL,
    reporter_email TEXT,
    division TEXT,
    department TEXT,

    -- Classification
    incident_type TEXT NOT NULL CHECK (incident_type IN ('Loss Event', 'Near Miss', 'Control Failure', 'Breach', 'Other')),
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5),

    -- Impact
    financial_impact NUMERIC(15,2),
    impact_description TEXT,

    -- Status & Resolution
    status TEXT NOT NULL DEFAULT 'Reported' CHECK (status IN ('Reported', 'Under Investigation', 'Resolved', 'Closed')),
    root_cause TEXT,
    corrective_actions TEXT,

    -- Risk Linkage
    linked_risk_codes TEXT[] DEFAULT '{}',
    ai_suggested_risks JSONB DEFAULT '[]',
    ai_control_recommendations JSONB DEFAULT '{}',
    manual_risk_links TEXT[] DEFAULT '{}',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_incidents_organization ON incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_user ON incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_linked_risks ON incidents USING GIN(linked_risk_codes);
CREATE INDEX IF NOT EXISTS idx_incidents_code ON incidents(incident_code);

-- =====================================================
-- 3. ADD ERM FIELDS TO EXISTING RISKS TABLE
-- =====================================================
-- Add columns for incident tracking and ERM features
ALTER TABLE risks
    ADD COLUMN IF NOT EXISTS subcategory TEXT,
    ADD COLUMN IF NOT EXISTS risk_appetite_status TEXT CHECK (risk_appetite_status IN ('Within', 'Near Limit', 'Breach')),
    ADD COLUMN IF NOT EXISTS linked_incident_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_incident_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS control_adequacy_score NUMERIC(3,2),
    ADD COLUMN IF NOT EXISTS ai_control_assessment JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS kri_code TEXT;

-- Create index for incident tracking
CREATE INDEX IF NOT EXISTS idx_risks_incident_count ON risks(linked_incident_count DESC);
CREATE INDEX IF NOT EXISTS idx_risks_last_incident ON risks(last_incident_date DESC NULLS LAST);

-- =====================================================
-- 4. CREATE RISK APPETITE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS risk_appetite (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,

    -- Appetite Definition
    category TEXT NOT NULL,
    subcategory TEXT,
    appetite_level TEXT NOT NULL CHECK (appetite_level IN ('None', 'Low', 'Moderate', 'High')),

    -- Thresholds
    max_residual_score INTEGER,
    max_inherent_score INTEGER,

    -- Description
    description TEXT,
    rationale TEXT,

    -- Approval
    approved_by TEXT,
    approved_date TIMESTAMP WITH TIME ZONE,
    review_period TEXT DEFAULT 'Annually' CHECK (review_period IN ('Quarterly', 'Semi-Annually', 'Annually')),
    next_review_date DATE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one appetite per category per organization
    UNIQUE(organization_id, category, subcategory)
);

CREATE INDEX IF NOT EXISTS idx_risk_appetite_org ON risk_appetite(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_appetite_category ON risk_appetite(category);

-- =====================================================
-- 5. CREATE KRI (KEY RISK INDICATORS) TABLES
-- =====================================================

-- KRI Definitions
CREATE TABLE IF NOT EXISTS kri_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,

    -- KRI Identification
    kri_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,

    -- Linkage
    linked_risk_code TEXT,
    category TEXT,

    -- Measurement
    unit TEXT, -- '%', 'count', 'currency', 'ratio'
    direction TEXT CHECK (direction IN ('Higher is better', 'Lower is better')),

    -- Thresholds
    threshold_green NUMERIC,
    threshold_amber NUMERIC,
    threshold_red NUMERIC,

    -- Tracking
    frequency TEXT CHECK (frequency IN ('Daily', 'Weekly', 'Monthly', 'Quarterly')),
    data_source TEXT,
    owner TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KRI Values (Time Series)
CREATE TABLE IF NOT EXISTS kri_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kri_code TEXT NOT NULL,

    -- Value
    value NUMERIC NOT NULL,
    recorded_date DATE NOT NULL,

    -- Status (computed based on thresholds)
    status TEXT CHECK (status IN ('Green', 'Amber', 'Red', 'Unknown')),

    -- Context
    notes TEXT,
    recorded_by TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate entries for same date
    UNIQUE(kri_code, recorded_date)
);

CREATE INDEX IF NOT EXISTS idx_kri_definitions_org ON kri_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_kri_definitions_code ON kri_definitions(kri_code);
CREATE INDEX IF NOT EXISTS idx_kri_values_code ON kri_values(kri_code);
CREATE INDEX IF NOT EXISTS idx_kri_values_date ON kri_values(recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_kri_values_status ON kri_values(status);

-- =====================================================
-- 6. CREATE AI ANALYSIS LOG TABLE
-- =====================================================
-- Track AI recommendations for audit and learning
CREATE TABLE IF NOT EXISTS ai_analysis_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Analysis Type
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('incident_risk_linking', 'control_adequacy', 'control_suggestion', 'risk_generation')),

    -- Context
    entity_type TEXT, -- 'incident', 'risk', 'control'
    entity_id TEXT,
    entity_code TEXT,

    -- AI Input/Output
    prompt_sent TEXT,
    ai_response JSONB,
    model_used TEXT,

    -- User Feedback
    user_action TEXT, -- 'accepted', 'rejected', 'modified'
    user_feedback TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ai_log_org ON ai_analysis_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_log_type ON ai_analysis_log(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_log_entity ON ai_analysis_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_log_date ON ai_analysis_log(created_at DESC);

-- =====================================================
-- 7. CREATE FUNCTION: UPDATE INCIDENT TIMESTAMP
-- =====================================================
CREATE OR REPLACE FUNCTION update_incident_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_incidents_timestamp
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_timestamp();

-- =====================================================
-- 8. CREATE FUNCTION: SYNC INCIDENT COUNT TO RISKS
-- =====================================================
-- Automatically update risk.linked_incident_count when incidents are linked
CREATE OR REPLACE FUNCTION sync_incident_count_to_risk()
RETURNS TRIGGER AS $$
DECLARE
    risk_code TEXT;
BEGIN
    -- Handle INSERT and UPDATE
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Update count for all linked risks
        FOREACH risk_code IN ARRAY NEW.linked_risk_codes
        LOOP
            UPDATE risks
            SET
                linked_incident_count = (
                    SELECT COUNT(*)
                    FROM incidents
                    WHERE NEW.linked_risk_codes @> ARRAY[risk_code]::TEXT[]
                    AND organization_id = NEW.organization_id
                ),
                last_incident_date = (
                    SELECT MAX(incident_date)
                    FROM incidents
                    WHERE linked_risk_codes @> ARRAY[risk_code]::TEXT[]
                    AND organization_id = NEW.organization_id
                )
            WHERE risk_code = risk_code
            AND organization_id = NEW.organization_id;
        END LOOP;
    END IF;

    -- Handle DELETE
    IF (TG_OP = 'DELETE') THEN
        FOREACH risk_code IN ARRAY OLD.linked_risk_codes
        LOOP
            UPDATE risks
            SET
                linked_incident_count = (
                    SELECT COUNT(*)
                    FROM incidents
                    WHERE linked_risk_codes @> ARRAY[risk_code]::TEXT[]
                    AND organization_id = OLD.organization_id
                ),
                last_incident_date = (
                    SELECT MAX(incident_date)
                    FROM incidents
                    WHERE linked_risk_codes @> ARRAY[risk_code]::TEXT[]
                    AND organization_id = OLD.organization_id
                )
            WHERE risk_code = risk_code
            AND organization_id = OLD.organization_id;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_incident_count
    AFTER INSERT OR UPDATE OR DELETE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION sync_incident_count_to_risk();

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_appetite ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_log ENABLE ROW LEVEL SECURITY;

-- Incidents Policies
CREATE POLICY "Users can view incidents in their organization"
    ON incidents FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create incidents in their organization"
    ON incidents FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their own incidents or admins can update any"
    ON incidents FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        AND (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM user_profiles
                WHERE id = auth.uid()
                AND role = 'admin'
            )
        )
    );

CREATE POLICY "Admins can delete incidents in their organization"
    ON incidents FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Risk Appetite Policies
CREATE POLICY "Users can view risk appetite in their organization"
    ON risk_appetite FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage risk appetite"
    ON risk_appetite FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- KRI Policies (similar pattern)
CREATE POLICY "Users can view KRIs in their organization"
    ON kri_definitions FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create KRI values"
    ON kri_values FOR INSERT
    WITH CHECK (
        kri_code IN (
            SELECT kri_code FROM kri_definitions
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can view KRI values in their organization"
    ON kri_values FOR SELECT
    USING (
        kri_code IN (
            SELECT kri_code FROM kri_definitions
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles WHERE id = auth.uid()
            )
        )
    );

-- AI Analysis Log Policies
CREATE POLICY "Users can view AI analysis in their organization"
    ON ai_analysis_log FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create AI analysis logs"
    ON ai_analysis_log FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        AND user_id = auth.uid()
    );

-- =====================================================
-- 10. CREATE HELPER VIEWS
-- =====================================================

-- View: Incidents with linked risk details
CREATE OR REPLACE VIEW incidents_with_risk_details AS
SELECT
    i.*,
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'risk_code', r.risk_code,
                'risk_title', r.risk_title,
                'category', r.category,
                'residual_score', r.likelihood_inherent * r.impact_inherent -- simplified
            )
        )
        FROM risks r
        WHERE r.risk_code = ANY(i.linked_risk_codes)
        AND r.organization_id = i.organization_id
    ) as linked_risks_details
FROM incidents i;

-- View: Risk appetite compliance
CREATE OR REPLACE VIEW risk_appetite_compliance AS
SELECT
    r.risk_code,
    r.risk_title,
    r.category,
    r.subcategory,
    r.likelihood_inherent * r.impact_inherent as inherent_score,
    -- Use inherent score as residual (no residual columns exist yet)
    r.likelihood_inherent * r.impact_inherent as residual_score,
    ra.appetite_level,
    ra.max_residual_score,
    CASE
        WHEN (r.likelihood_inherent * r.impact_inherent) > ra.max_residual_score THEN 'Breach'
        WHEN (r.likelihood_inherent * r.impact_inherent) > (ra.max_residual_score * 0.8) THEN 'Near Limit'
        ELSE 'Within'
    END as appetite_status
FROM risks r
LEFT JOIN risk_appetite ra ON r.category = ra.category
    AND (ra.subcategory IS NULL OR r.subcategory = ra.subcategory)
    AND r.organization_id = ra.organization_id;

-- =====================================================
-- 11. INSERT DEFAULT RISK APPETITE VALUES
-- =====================================================
-- These are template values - adjust based on organization needs
-- Note: This will only insert if the table is empty

INSERT INTO risk_appetite (organization_id, category, appetite_level, max_residual_score, description)
SELECT
    (SELECT organization_id FROM user_profiles LIMIT 1), -- Use first org as default
    category,
    appetite_level,
    max_score,
    description
FROM (VALUES
    ('Strategic', 'Moderate', 15, 'Moderate appetite for strategic risks that drive innovation'),
    ('Credit', 'Low', 12, 'Low appetite for credit/counterparty risk'),
    ('Market', 'Moderate', 15, 'Moderate appetite for market risk within limits'),
    ('Liquidity', 'Low', 10, 'Low appetite for liquidity risk'),
    ('Operational', 'Low', 12, 'Low appetite for operational failures'),
    ('Legal/Compliance', 'None', 8, 'Zero tolerance for compliance breaches'),
    ('Technology', 'Low', 12, 'Low appetite for technology disruptions'),
    ('ESG', 'Low', 10, 'Low appetite for ESG-related risks'),
    ('Reputational', 'None', 8, 'Zero tolerance for reputational damage')
) AS default_values(category, appetite_level, max_score, description)
WHERE NOT EXISTS (SELECT 1 FROM risk_appetite LIMIT 1);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Tables created:
--   - incidents
--   - risk_appetite
--   - kri_definitions
--   - kri_values
--   - ai_analysis_log
--
-- Tables modified:
--   - risks (added ERM fields)
--
-- Functions created:
--   - update_incident_timestamp()
--   - sync_incident_count_to_risk()
--
-- Views created:
--   - incidents_with_risk_details
--   - risk_appetite_compliance
--
-- Ready for Phase 1 implementation!
-- =====================================================
