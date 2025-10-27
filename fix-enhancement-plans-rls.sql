-- Fix RLS Policies for Control Enhancement Plans
-- Issue: Users getting 403 when trying to save enhancement plans
-- Root cause: INSERT policy too restrictive (only allows plans for own incidents)
-- Solution: Allow users to create plans for any incident in their organization

-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "Users create plans for own incidents" ON control_enhancement_plans;

-- Create new INSERT policy: Users can create plans for incidents in their organization
CREATE POLICY "Users create plans for org incidents"
ON control_enhancement_plans FOR INSERT
WITH CHECK (
  -- Must be in same organization
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
  AND
  -- Incident must be in same organization (not just owned by user)
  incident_id IN (
    SELECT id FROM incidents
    WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- Also update SELECT policy to be consistent
DROP POLICY IF EXISTS "Users see own plans; Admins see all" ON control_enhancement_plans;

CREATE POLICY "Users see org plans"
ON control_enhancement_plans FOR SELECT
USING (
  -- Same organization
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Update UPDATE policy to be consistent
DROP POLICY IF EXISTS "Users update own plans; Admins update all" ON control_enhancement_plans;

CREATE POLICY "Users update org plans"
ON control_enhancement_plans FOR UPDATE
USING (
  -- Same organization
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Verify the new policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'control_enhancement_plans'
ORDER BY policyname;
