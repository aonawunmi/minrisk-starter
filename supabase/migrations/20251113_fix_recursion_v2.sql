-- Fix: Infinite Recursion in user_profiles RLS Policies V2
-- Use a SECURITY DEFINER function to break the recursion chain

-- Create a function that gets the user's organization_id without triggering RLS
CREATE OR REPLACE FUNCTION get_user_org_id(user_id UUID)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id
  FROM user_profiles
  WHERE id = user_id
  LIMIT 1;
$$;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view org members" ON user_profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can view members of their organization
-- This uses the SECURITY DEFINER function to avoid recursion
CREATE POLICY "Users can view org members"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
  );

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_org_id(UUID) TO authenticated;
