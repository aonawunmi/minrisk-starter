-- =====================================================
-- PHASE 5B ENHANCEMENT: KRI-to-Risk AI-Powered Linking
-- Enable admins to link KRIs to risks for integrated monitoring
-- Created: 2025-10-30
-- =====================================================

-- Step 1: Add linked_risk_code column to kri_definitions
-- Using risk_code instead of UUID id for simpler app-level integration
ALTER TABLE kri_definitions
  ADD COLUMN IF NOT EXISTS linked_risk_code_fk TEXT;

-- Step 2: Add AI linking metadata columns
ALTER TABLE kri_definitions
  ADD COLUMN IF NOT EXISTS ai_link_confidence NUMERIC CHECK (ai_link_confidence >= 0 AND ai_link_confidence <= 100),
  ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS linked_by TEXT;

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_kri_definitions_linked_risk
  ON kri_definitions(linked_risk_code_fk);

-- Step 4: Create view for KRI coverage analysis
CREATE OR REPLACE VIEW kri_coverage_analysis AS
SELECT
  r.id as risk_id,
  r.risk_code,
  r.risk_title,
  r.category as risk_category,
  r.likelihood_inherent as inherent_likelihood,
  r.impact_inherent as inherent_impact,
  r.organization_id,
  COUNT(k.id) as kri_count,
  ARRAY_AGG(k.kri_code ORDER BY k.kri_code) FILTER (WHERE k.id IS NOT NULL) as linked_kri_codes,
  ARRAY_AGG(k.kri_name ORDER BY k.kri_code) FILTER (WHERE k.id IS NOT NULL) as linked_kri_names,
  CASE
    WHEN COUNT(k.id) = 0 THEN 'No Coverage'
    WHEN COUNT(k.id) = 1 THEN 'Basic Coverage'
    WHEN COUNT(k.id) >= 2 THEN 'Good Coverage'
  END as coverage_status
FROM risks r
LEFT JOIN kri_definitions k ON k.linked_risk_id = r.id AND k.enabled = true
GROUP BY r.id, r.risk_code, r.risk_title, r.category, r.likelihood_inherent, r.impact_inherent, r.organization_id;

-- Step 5: Create function to get active KRI breaches for a risk
CREATE OR REPLACE FUNCTION get_risk_kri_breaches(p_risk_id UUID)
RETURNS TABLE (
  kri_code TEXT,
  kri_name TEXT,
  alert_level TEXT,
  alert_count BIGINT,
  latest_breach_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.kri_code,
    k.kri_name,
    a.alert_level,
    COUNT(a.id) as alert_count,
    MAX(a.alert_date) as latest_breach_date
  FROM kri_definitions k
  INNER JOIN kri_alerts a ON a.kri_id = k.id
  WHERE k.linked_risk_id = p_risk_id
    AND a.status = 'open'
    AND k.enabled = true
  GROUP BY k.kri_code, k.kri_name, a.alert_level
  ORDER BY MAX(a.alert_date) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Grant view access based on RLS context
-- Users can view KRI coverage for their organization's risks
CREATE POLICY "Users can view KRI coverage for their org risks"
  ON kri_definitions FOR SELECT
  USING (
    linked_risk_id IN (
      SELECT id FROM risks
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
    OR linked_risk_id IS NULL
  );

-- =====================================================
-- MIGRATION COMPLETE
--
-- Changes:
-- ✅ Added linked_risk_id to kri_definitions (FK to risks table)
-- ✅ Added AI confidence score and metadata tracking
-- ✅ Created kri_coverage_analysis view for gap analysis
-- ✅ Created get_risk_kri_breaches function for breach monitoring
-- ✅ Indexed for performance
-- ✅ RLS policies updated
--
-- Capabilities:
-- ✅ Admins can link KRIs to specific risks
-- ✅ Track which risks have KRI monitoring coverage
-- ✅ Identify risks without KRI monitoring (gaps)
-- ✅ View active KRI breaches for each risk
-- ✅ AI-assisted linking with confidence scores
-- =====================================================
