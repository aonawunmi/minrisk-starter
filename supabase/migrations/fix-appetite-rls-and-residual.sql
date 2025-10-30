-- =====================================================
-- FIX: Risk Appetite RLS and Residual Risk Calculation
-- Date: 2025-10-30
-- Purpose: Fix RLS policies and update functions to use residual risk
-- =====================================================

-- 1. Add UPDATE policy for risk_appetite_history (needed for ON CONFLICT DO UPDATE)
DROP POLICY IF EXISTS "System can update history" ON risk_appetite_history;
CREATE POLICY "System can update history"
  ON risk_appetite_history FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 2. Update calculate_appetite_utilization to use residual risk and SECURITY DEFINER
CREATE OR REPLACE FUNCTION calculate_appetite_utilization(org_id UUID)
RETURNS TABLE (
  total_risks INTEGER,
  risks_within_appetite INTEGER,
  risks_over_appetite INTEGER,
  avg_score DECIMAL(5,2),
  utilization DECIMAL(5,2)
)
SECURITY DEFINER
AS $$
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
      SELECT id FROM risks WHERE organization_id = org_id
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
      ra.appetite_threshold,
      ra.tolerance_max
    FROM risks r
    LEFT JOIN max_reductions mr ON mr.risk_id = r.id
    INNER JOIN risk_appetite_config ra  -- Changed to INNER JOIN: only count configured risks
      ON ra.organization_id = r.organization_id
      AND ra.category = r.category
      AND ra.effective_from <= CURRENT_DATE
      AND (ra.effective_to IS NULL OR ra.effective_to >= CURRENT_DATE)
    WHERE r.organization_id = org_id
    -- Only includes risks with explicit appetite configurations
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

-- 3. Update generate_appetite_snapshot to use SECURITY DEFINER
CREATE OR REPLACE FUNCTION generate_appetite_snapshot(org_id UUID)
RETURNS VOID
SECURITY DEFINER
AS $$
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
-- Verification Query (optional - run to confirm)
-- =====================================================

-- Check that policies exist
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'risk_appetite_history'
ORDER BY cmd, policyname;

-- Test the function (replace with your org_id)
-- SELECT * FROM calculate_appetite_utilization('your-org-id-here');
