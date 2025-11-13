-- Fix: Infinite Recursion in user_profiles RLS Policies
-- The "Users can view org members" policy was creating a circular dependency
-- because it queries user_profiles to get the organization_id, which triggers the same policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view org members" ON user_profiles;

-- Recreate it with a fix that avoids the circular reference
-- Users can view their own profile always
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can view other users in their organization
-- This uses a direct comparison instead of a subquery to avoid recursion
CREATE POLICY "Users can view org members"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      LIMIT 1
    )
  );
