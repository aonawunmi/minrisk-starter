-- Fix RLS DELETE permission for risk_intelligence_alerts table
-- This allows users to delete alerts from their own organization

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete alerts from their organization" ON risk_intelligence_alerts;

-- Create new delete policy
CREATE POLICY "Users can delete alerts from their organization"
  ON risk_intelligence_alerts
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Verify the policy was created
COMMENT ON POLICY "Users can delete alerts from their organization" ON risk_intelligence_alerts
IS 'Allows authenticated users to delete risk intelligence alerts belonging to their organization';
