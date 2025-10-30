-- =====================================================
-- FIX: Update KRI-Risk linking to use risk_code instead of UUID
-- The app uses risk_code as the identifier, not UUID id
-- Created: 2025-10-30
-- =====================================================

-- Step 1: Drop dependent objects first
DROP VIEW IF EXISTS kri_coverage_analysis CASCADE;
DROP POLICY IF EXISTS "Users can view KRI coverage for their org risks" ON kri_definitions;

-- Step 2: Drop existing UUID-based column and index
DROP INDEX IF EXISTS idx_kri_definitions_linked_risk;
ALTER TABLE kri_definitions DROP COLUMN IF EXISTS linked_risk_id;

-- Add risk_code-based column (simpler for app integration)
ALTER TABLE kri_definitions
  ADD COLUMN IF NOT EXISTS linked_risk_code TEXT;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_kri_definitions_linked_risk_code
  ON kri_definitions(linked_risk_code);

-- Update view to use risk_code
DROP VIEW IF EXISTS kri_coverage_analysis;
CREATE VIEW kri_coverage_analysis AS
SELECT
  r.risk_code as risk_id,
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
LEFT JOIN kri_definitions k ON k.linked_risk_code = r.risk_code AND k.enabled = true
GROUP BY r.risk_code, r.risk_title, r.category, r.likelihood_inherent, r.impact_inherent, r.organization_id;

-- Update function parameter type
DROP FUNCTION IF EXISTS get_risk_kri_breaches(UUID);
CREATE OR REPLACE FUNCTION get_risk_kri_breaches(p_risk_code TEXT)
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
  WHERE k.linked_risk_code = p_risk_code
    AND a.status = 'open'
    AND k.enabled = true
  GROUP BY k.kri_code, k.kri_name, a.alert_level
  ORDER BY MAX(a.alert_date) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policy
DROP POLICY IF EXISTS "Users can view KRI coverage for their org risks" ON kri_definitions;
CREATE POLICY "Users can view linked KRIs for org risks"
  ON kri_definitions FOR SELECT
  USING (
    linked_risk_code IN (
      SELECT risk_code FROM risks
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
    OR linked_risk_code IS NULL
  );

-- =====================================================
-- MIGRATION COMPLETE
--
-- Changes:
-- ✅ Replaced linked_risk_id (UUID) with linked_risk_code (TEXT)
-- ✅ Updated kri_coverage_analysis view to join on risk_code
-- ✅ Updated get_risk_kri_breaches function to accept risk_code
-- ✅ Updated RLS policies
--
-- Result:
-- ✅ Simpler app integration - no UUID lookup needed
-- ✅ All frontend code can use risk_code directly
-- =====================================================
