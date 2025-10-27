-- =====================================================
-- UPGRADE 1: CONTROL ENHANCEMENT PLANS
-- Persist AI Control Adequacy Assessments
-- =====================================================
-- Run this in Supabase SQL Editor

-- =====================================================
-- CREATE ENHANCEMENT PLANS TABLE
-- =====================================================

CREATE TABLE control_enhancement_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,

  -- Assessment snapshot
  assessment_date TIMESTAMPTZ DEFAULT NOW(),
  overall_adequacy_score INTEGER,
  findings TEXT[],

  -- Recommendations (JSONB array)
  recommendations JSONB DEFAULT '[]',
  /* Structure:
  [{
    type: 'assessment' | 'improvement' | 'new_control',
    description: string,
    priority: 'high' | 'medium' | 'low',
    status: 'pending' | 'accepted' | 'rejected' | 'implemented',
    risk_code: string (optional),
    implementation_notes: string (optional),
    accepted_by: UUID (optional),
    accepted_at: timestamp (optional)
  }]
  */

  -- Linked risks at assessment time
  linked_risks_snapshot JSONB DEFAULT '[]',
  /* Structure:
  [{
    risk_code: string,
    risk_title: string,
    category: string,
    likelihood_inherent: integer,
    impact_inherent: integer
  }]
  */

  -- Overall plan status
  status TEXT DEFAULT 'pending', -- pending, partially_accepted, fully_accepted, rejected

  -- Review tracking
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX idx_enhancement_plans_incident ON control_enhancement_plans(incident_id);
CREATE INDEX idx_enhancement_plans_org ON control_enhancement_plans(organization_id);
CREATE INDEX idx_enhancement_plans_status ON control_enhancement_plans(status);
CREATE INDEX idx_enhancement_plans_created ON control_enhancement_plans(created_at DESC);

-- =====================================================
-- CREATE TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_enhancement_plan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enhancement_plan_updated_at
  BEFORE UPDATE ON control_enhancement_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_enhancement_plan_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE control_enhancement_plans ENABLE ROW LEVEL SECURITY;

-- SELECT: Users see plans for their own incidents + Admins see all
CREATE POLICY "Users see own plans; Admins see all"
ON control_enhancement_plans FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
  AND (
    -- User owns the incident this plan is for
    incident_id IN (
      SELECT id FROM incidents WHERE user_id = auth.uid()
    )
    OR
    -- OR user is an Admin
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- INSERT: Users can create plans for their own incidents
CREATE POLICY "Users create plans for own incidents"
ON control_enhancement_plans FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
  AND incident_id IN (
    SELECT id FROM incidents WHERE user_id = auth.uid()
  )
);

-- UPDATE: Users update their own plans + Admins update all
CREATE POLICY "Users update own plans; Admins update all"
ON control_enhancement_plans FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
  AND (
    -- User owns the incident
    incident_id IN (
      SELECT id FROM incidents WHERE user_id = auth.uid()
    )
    OR
    -- OR user is Admin
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- DELETE: Only admins can delete plans
CREATE POLICY "Admins delete plans"
ON control_enhancement_plans FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- VERIFY INSTALLATION
-- =====================================================

-- Check table structure
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'control_enhancement_plans'
ORDER BY ordinal_position;

-- Check policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'control_enhancement_plans'
ORDER BY policyname;

-- =====================================================
-- NOTES
-- =====================================================

-- SECURITY MODEL:
-- 1. Users can see and manage enhancement plans for incidents they created
-- 2. Admins can see and manage all enhancement plans in their organization
-- 3. Plans are tied to incidents via incident_id foreign key
-- 4. When incident is deleted, all associated plans are cascade deleted

-- WORKFLOW:
-- 1. User runs AI Control Assessment on incident
-- 2. User clicks "Save Assessment" button
-- 3. System creates control_enhancement_plan record
-- 4. User reviews recommendations:
--    - Accept: Update recommendation.status = 'accepted'
--    - Reject: Update recommendation.status = 'rejected'
-- 5. Mark as implemented when controls are added
-- 6. Admin can view all pending enhancements organization-wide

-- DEPLOYMENT:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify table and policies created
-- 3. Test with sample data
-- 4. Deploy frontend code
