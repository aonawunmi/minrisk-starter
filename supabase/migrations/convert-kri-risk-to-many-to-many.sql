-- =====================================================
-- Convert KRI-Risk linking from one-to-one to many-to-many
-- Allow one KRI to monitor multiple risks simultaneously
-- Created: 2025-10-30
-- =====================================================

-- Step 1: Create junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS kri_risk_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,
  organization_id UUID NOT NULL,

  -- AI linking metadata (preserved from original design)
  ai_link_confidence INTEGER CHECK (ai_link_confidence >= 0 AND ai_link_confidence <= 100),
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  linked_by UUID REFERENCES auth.users(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one KRI can link to same risk only once
  UNIQUE(kri_id, risk_code)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_kri_risk_links_kri_id ON kri_risk_links(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_risk_links_risk_code ON kri_risk_links(risk_code);
CREATE INDEX IF NOT EXISTS idx_kri_risk_links_org ON kri_risk_links(organization_id);

-- Step 2: Migrate existing data from kri_definitions.linked_risk_code
INSERT INTO kri_risk_links (kri_id, risk_code, organization_id, ai_link_confidence, linked_at, linked_by)
SELECT
  id as kri_id,
  linked_risk_code as risk_code,
  organization_id,
  ai_link_confidence,
  linked_at,
  CASE
    WHEN linked_by IS NOT NULL THEN linked_by::uuid
    ELSE NULL
  END as linked_by
FROM kri_definitions
WHERE linked_risk_code IS NOT NULL
ON CONFLICT (kri_id, risk_code) DO NOTHING;

-- Step 3: Drop dependent objects FIRST before dropping columns
DROP VIEW IF EXISTS kri_coverage_analysis;

-- Drop any policies that depend on linked_risk_code
DROP POLICY IF EXISTS "Users can view linked KRIs for org risks" ON kri_definitions;

-- Step 4: Now safe to drop old columns from kri_definitions
ALTER TABLE kri_definitions DROP COLUMN IF EXISTS linked_risk_code;
ALTER TABLE kri_definitions DROP COLUMN IF EXISTS ai_link_confidence;
ALTER TABLE kri_definitions DROP COLUMN IF EXISTS linked_at;
ALTER TABLE kri_definitions DROP COLUMN IF EXISTS linked_by;

-- Step 5: Recreate kri_coverage_analysis view to use junction table
CREATE VIEW kri_coverage_analysis AS
SELECT
  r.risk_code as risk_id,
  r.risk_code,
  r.risk_title,
  r.category as risk_category,
  r.likelihood_inherent as inherent_likelihood,
  r.impact_inherent as inherent_impact,
  r.organization_id,
  COUNT(DISTINCT k.id) as kri_count,
  ARRAY_AGG(DISTINCT k.kri_code ORDER BY k.kri_code) FILTER (WHERE k.id IS NOT NULL) as linked_kri_codes,
  ARRAY_AGG(DISTINCT k.kri_name ORDER BY k.kri_name) FILTER (WHERE k.id IS NOT NULL) as linked_kri_names,
  CASE
    WHEN COUNT(DISTINCT k.id) = 0 THEN 'No Coverage'
    WHEN COUNT(DISTINCT k.id) = 1 THEN 'Basic Coverage'
    WHEN COUNT(DISTINCT k.id) >= 2 THEN 'Good Coverage'
  END as coverage_status
FROM risks r
LEFT JOIN kri_risk_links krl ON krl.risk_code = r.risk_code
LEFT JOIN kri_definitions k ON k.id = krl.kri_id AND k.enabled = true
GROUP BY r.risk_code, r.risk_title, r.category, r.likelihood_inherent, r.impact_inherent, r.organization_id;

-- Step 6: Update get_risk_kri_breaches function to use junction table
DROP FUNCTION IF EXISTS get_risk_kri_breaches(TEXT);
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
  INNER JOIN kri_risk_links krl ON krl.kri_id = k.id
  INNER JOIN kri_alerts a ON a.kri_id = k.id
  WHERE krl.risk_code = p_risk_code
    AND a.status = 'open'
    AND k.enabled = true
  GROUP BY k.kri_code, k.kri_name, a.alert_level
  ORDER BY MAX(a.alert_date) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create helper function to get all risks linked to a KRI
CREATE OR REPLACE FUNCTION get_linked_risks_for_kri(p_kri_id UUID)
RETURNS TABLE (
  risk_code TEXT,
  risk_title TEXT,
  ai_link_confidence INTEGER,
  linked_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.risk_code,
    r.risk_title,
    krl.ai_link_confidence,
    krl.linked_at
  FROM kri_risk_links krl
  INNER JOIN risks r ON r.risk_code = krl.risk_code
  WHERE krl.kri_id = p_kri_id
  ORDER BY krl.linked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: RLS Policies for kri_risk_links table
ALTER TABLE kri_risk_links ENABLE ROW LEVEL SECURITY;

-- Users can view links for their organization
CREATE POLICY "Users can view KRI-risk links for their org"
  ON kri_risk_links FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can create links (will be restricted to admins in app layer)
CREATE POLICY "Users can create KRI-risk links"
  ON kri_risk_links FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can delete links for their org
CREATE POLICY "Users can delete KRI-risk links for their org"
  ON kri_risk_links FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- MIGRATION COMPLETE
--
-- Changes:
-- ✅ Created kri_risk_links junction table
-- ✅ Migrated existing links from kri_definitions
-- ✅ Removed old columns from kri_definitions
-- ✅ Updated kri_coverage_analysis view
-- ✅ Updated get_risk_kri_breaches function
-- ✅ Created get_linked_risks_for_kri helper function
-- ✅ Set up RLS policies
--
-- Result:
-- ✅ One KRI can now monitor multiple risks
-- ✅ Existing links preserved during migration
-- ✅ All queries updated to use junction table
-- =====================================================
