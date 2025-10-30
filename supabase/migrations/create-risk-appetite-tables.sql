-- =====================================================
-- PHASE 5A: RISK APPETITE FRAMEWORK
-- Migration: Create Risk Appetite Tables
-- Created: 2025-10-30
-- Description: ISO 31000 Enhancement - Risk Appetite Management
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE 1: Risk Appetite Configuration
-- Purpose: Store appetite thresholds by risk category
-- =====================================================

CREATE TABLE IF NOT EXISTS risk_appetite_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  category VARCHAR(50) NOT NULL,
  appetite_threshold INTEGER NOT NULL CHECK (appetite_threshold BETWEEN 1 AND 30),
  tolerance_min INTEGER NOT NULL CHECK (tolerance_min >= 1),
  tolerance_max INTEGER NOT NULL CHECK (tolerance_max <= 30),
  rationale TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT appetite_threshold_order CHECK (tolerance_min <= appetite_threshold AND appetite_threshold <= tolerance_max),
  CONSTRAINT unique_appetite_config UNIQUE(organization_id, category, effective_from)
);

-- Create indexes for performance
CREATE INDEX idx_appetite_config_org ON risk_appetite_config(organization_id);
CREATE INDEX idx_appetite_config_category ON risk_appetite_config(category);
CREATE INDEX idx_appetite_config_effective ON risk_appetite_config(effective_from, effective_to);

-- Enable Row Level Security
ALTER TABLE risk_appetite_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their organization's appetite config
CREATE POLICY "Users can view their org appetite config"
  ON risk_appetite_config FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- RLS Policy: Only admins can insert/update appetite config
CREATE POLICY "Admins can manage appetite config"
  ON risk_appetite_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND organization_id = risk_appetite_config.organization_id
      AND role = 'admin'
    )
  );

-- =====================================================
-- TABLE 2: Risk Appetite Exceptions
-- Purpose: Track risks that exceed appetite with justification
-- =====================================================

CREATE TABLE IF NOT EXISTS risk_appetite_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  justification TEXT NOT NULL,
  mitigation_plan TEXT NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  review_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_active_exception UNIQUE(risk_id, organization_id)
);

-- Create indexes
CREATE INDEX idx_appetite_exceptions_org ON risk_appetite_exceptions(organization_id);
CREATE INDEX idx_appetite_exceptions_risk ON risk_appetite_exceptions(risk_id);
CREATE INDEX idx_appetite_exceptions_status ON risk_appetite_exceptions(status);
CREATE INDEX idx_appetite_exceptions_review ON risk_appetite_exceptions(review_date);

-- Enable Row Level Security
ALTER TABLE risk_appetite_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view exceptions for their organization
CREATE POLICY "Users can view org exceptions"
  ON risk_appetite_exceptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can create exceptions for their risks
CREATE POLICY "Users can create exceptions"
  ON risk_appetite_exceptions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- RLS Policy: Admins can approve/reject exceptions
CREATE POLICY "Admins can manage exceptions"
  ON risk_appetite_exceptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND organization_id = risk_appetite_exceptions.organization_id
      AND role = 'admin'
    )
  );

-- =====================================================
-- TABLE 3: Risk Appetite History
-- Purpose: Track appetite utilization over time
-- =====================================================

CREATE TABLE IF NOT EXISTS risk_appetite_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_risks INTEGER NOT NULL DEFAULT 0,
  risks_within_appetite INTEGER NOT NULL DEFAULT 0,
  risks_over_appetite INTEGER NOT NULL DEFAULT 0,
  avg_risk_score DECIMAL(5,2),
  appetite_utilization DECIMAL(5,2), -- percentage
  category_breakdown JSONB, -- detailed breakdown by category
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_snapshot UNIQUE(organization_id, snapshot_date),
  CONSTRAINT valid_utilization CHECK (appetite_utilization >= 0 AND appetite_utilization <= 100)
);

-- Create indexes
CREATE INDEX idx_appetite_history_org ON risk_appetite_history(organization_id);
CREATE INDEX idx_appetite_history_date ON risk_appetite_history(snapshot_date DESC);

-- Enable Row Level Security
ALTER TABLE risk_appetite_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their organization's history
CREATE POLICY "Users can view org appetite history"
  ON risk_appetite_history FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- RLS Policy: System can insert history records (via scheduled job or backend)
CREATE POLICY "System can insert history"
  ON risk_appetite_history FOR INSERT
  WITH CHECK (true); -- Will be called by backend service

-- =====================================================
-- FUNCTION: Calculate Appetite Utilization
-- Purpose: Calculate how much of risk appetite is being utilized
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_appetite_utilization(org_id UUID)
RETURNS TABLE (
  total_risks INTEGER,
  risks_within_appetite INTEGER,
  risks_over_appetite INTEGER,
  avg_score DECIMAL(5,2),
  utilization DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH control_effectiveness AS (
    -- Calculate effectiveness for each control
    SELECT
      c.risk_id,
      c.target,
      CASE
        WHEN c.design = 0 OR c.implementation = 0 THEN 0
        ELSE (c.design + c.implementation + c.monitoring + c.effectiveness_evaluation)::DECIMAL / 12.0
      END as effectiveness
    FROM controls c
    WHERE c.risk_id IN (
      SELECT id FROM risks WHERE organization_id = org_id AND deleted_at IS NULL AND archived_at IS NULL
    )
  ),
  max_reductions AS (
    -- Get maximum reduction per risk for each target type
    SELECT
      risk_id,
      MAX(CASE WHEN target = 'Likelihood' THEN effectiveness ELSE 0 END) as max_likelihood_reduction,
      MAX(CASE WHEN target = 'Impact' THEN effectiveness ELSE 0 END) as max_impact_reduction
    FROM control_effectiveness
    GROUP BY risk_id
  ),
  risk_data AS (
    SELECT
      r.risk_code,
      r.category,
      -- Calculate residual risk using same formula as frontend
      GREATEST(1, r.likelihood_inherent - (r.likelihood_inherent - 1) * COALESCE(mr.max_likelihood_reduction, 0)) *
      GREATEST(1, r.impact_inherent - (r.impact_inherent - 1) * COALESCE(mr.max_impact_reduction, 0)) as risk_score,
      COALESCE(ra.appetite_threshold, 15) as appetite_threshold,
      COALESCE(ra.tolerance_max, 18) as tolerance_max
    FROM risks r
    LEFT JOIN max_reductions mr ON mr.risk_id = r.id
    LEFT JOIN risk_appetite_config ra
      ON ra.organization_id = r.organization_id
      AND ra.category = r.category
      AND ra.effective_from <= CURRENT_DATE
      AND (ra.effective_to IS NULL OR ra.effective_to >= CURRENT_DATE)
    WHERE r.organization_id = org_id
      AND r.deleted_at IS NULL
      AND r.archived_at IS NULL
  )
  SELECT
    COUNT(*)::INTEGER as total_risks,
    COUNT(*) FILTER (WHERE risk_score <= tolerance_max)::INTEGER as risks_within_appetite,
    COUNT(*) FILTER (WHERE risk_score > tolerance_max)::INTEGER as risks_over_appetite,
    ROUND(AVG(risk_score), 2) as avg_score,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((AVG(risk_score) / 30.0) * 100, 2)
    END as utilization
  FROM risk_data;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Generate Daily Appetite Snapshot
-- Purpose: Create daily snapshot of appetite utilization
-- =====================================================

CREATE OR REPLACE FUNCTION generate_appetite_snapshot(org_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total INTEGER;
  v_within INTEGER;
  v_over INTEGER;
  v_avg DECIMAL(5,2);
  v_util DECIMAL(5,2);
BEGIN
  -- Get current utilization
  SELECT * INTO v_total, v_within, v_over, v_avg, v_util
  FROM calculate_appetite_utilization(org_id);

  -- Insert or update today's snapshot
  INSERT INTO risk_appetite_history (
    organization_id,
    snapshot_date,
    total_risks,
    risks_within_appetite,
    risks_over_appetite,
    avg_risk_score,
    appetite_utilization
  ) VALUES (
    org_id,
    CURRENT_DATE,
    v_total,
    v_within,
    v_over,
    v_avg,
    v_util
  )
  ON CONFLICT (organization_id, snapshot_date)
  DO UPDATE SET
    total_risks = EXCLUDED.total_risks,
    risks_within_appetite = EXCLUDED.risks_within_appetite,
    risks_over_appetite = EXCLUDED.risks_over_appetite,
    avg_risk_score = EXCLUDED.avg_risk_score,
    appetite_utilization = EXCLUDED.appetite_utilization,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Update timestamp on config changes
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_risk_appetite_config_updated_at
    BEFORE UPDATE ON risk_appetite_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_appetite_exceptions_updated_at
    BEFORE UPDATE ON risk_appetite_exceptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA: Default Appetite Thresholds
-- Purpose: Provide sensible defaults for common risk categories
-- =====================================================

-- Note: This will be executed per organization when they first use the feature
-- For now, commenting out to avoid inserting without org context
--
-- INSERT INTO risk_appetite_config (organization_id, category, appetite_threshold, tolerance_min, tolerance_max, rationale)
-- VALUES
--   ('{org_id}', 'Strategic', 12, 10, 15, 'Moderate appetite for strategic risks aligned with growth objectives'),
--   ('{org_id}', 'Operational', 10, 8, 12, 'Lower appetite for operational risks to ensure business continuity'),
--   ('{org_id}', 'Financial', 15, 12, 18, 'Higher appetite for financial risks given market opportunities'),
--   ('{org_id}', 'Compliance', 6, 4, 8, 'Very low appetite for compliance risks to avoid regulatory penalties'),
--   ('{org_id}', 'Cyber', 8, 6, 10, 'Low appetite for cyber risks given increasing threat landscape');

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE risk_appetite_config IS 'Stores organization risk appetite thresholds by category for ISO 31000 compliance';
COMMENT ON TABLE risk_appetite_exceptions IS 'Tracks risks exceeding appetite with justification and approval workflow';
COMMENT ON TABLE risk_appetite_history IS 'Historical tracking of appetite utilization for trend analysis';

COMMENT ON COLUMN risk_appetite_config.appetite_threshold IS 'Target risk score (1-30) representing acceptable risk level';
COMMENT ON COLUMN risk_appetite_config.tolerance_min IS 'Minimum acceptable risk score (lower bound of tolerance range)';
COMMENT ON COLUMN risk_appetite_config.tolerance_max IS 'Maximum acceptable risk score (upper bound of tolerance range)';

COMMENT ON FUNCTION calculate_appetite_utilization IS 'Calculates real-time appetite utilization metrics for an organization';
COMMENT ON FUNCTION generate_appetite_snapshot IS 'Creates daily snapshot of appetite metrics for historical tracking';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT ON risk_appetite_config TO authenticated;
GRANT SELECT ON risk_appetite_exceptions TO authenticated;
GRANT SELECT ON risk_appetite_history TO authenticated;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION calculate_appetite_utilization TO authenticated;
GRANT EXECUTE ON FUNCTION generate_appetite_snapshot TO service_role;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verification query (run after migration)
-- SELECT
--   'risk_appetite_config' as table_name,
--   COUNT(*) as row_count
-- FROM risk_appetite_config
-- UNION ALL
-- SELECT
--   'risk_appetite_exceptions' as table_name,
--   COUNT(*) as row_count
-- FROM risk_appetite_exceptions
-- UNION ALL
-- SELECT
--   'risk_appetite_history' as table_name,
--   COUNT(*) as row_count
-- FROM risk_appetite_history;
