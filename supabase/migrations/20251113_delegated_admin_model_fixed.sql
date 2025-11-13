-- Migration: Implement Delegated Admin Management (Model B) - FIXED
-- SUPERADMIN → PRIMARY ADMIN → SECONDARY ADMINS → USERS

-- Step 1: Migrate existing 'admin' users to 'primary_admin' FIRST
-- This must happen before we update the constraint
UPDATE user_profiles
SET role = 'primary_admin'
WHERE role = 'admin';

-- Step 2: Update any 'edit' or 'view_only' roles to 'user'
UPDATE user_profiles
SET role = 'user'
WHERE role IN ('edit', 'view_only');

-- Step 3: Now update the constraint to support new role hierarchy
DO $$
BEGIN
  -- Drop the old constraint
  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

  -- Add new constraint with all role types
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
    CHECK (role IN ('primary_admin', 'secondary_admin', 'user'));

EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 4: Add column to track primary admin per organization
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS primary_admin_id UUID REFERENCES user_profiles(id);

-- Step 5: Create function to count secondary admins per organization
CREATE OR REPLACE FUNCTION count_secondary_admins(org_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM user_profiles
  WHERE organization_id = org_id
    AND role = 'secondary_admin';
$$;

-- Step 6: Create function to check if user is primary admin of their org
CREATE OR REPLACE FUNCTION is_primary_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN organizations o ON o.primary_admin_id = up.id
    WHERE up.id = auth.uid()
  );
END;
$$;

-- Step 7: Create function to check if user can create secondary admin
CREATE OR REPLACE FUNCTION can_create_secondary_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_count INTEGER;
BEGIN
  -- Only primary admin can create secondary admins
  IF NOT is_primary_admin() THEN
    RETURN FALSE;
  END IF;

  -- Check if we're at the limit (max 3 secondary admins)
  v_current_count := count_secondary_admins(org_id);

  RETURN v_current_count < 3;
END;
$$;

-- Step 8: Update RLS policies for user_profiles to respect new hierarchy

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view users in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Admins can create users in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can view all users" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can manage all users" ON user_profiles;

-- Super admins can see all users
CREATE POLICY "Super admins can view all users"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Users can view users in their organization
CREATE POLICY "Users can view org members"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (organization_id = (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Primary admins can create secondary admins (up to 3) and users
CREATE POLICY "Primary admins can create secondary admins and users"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    is_primary_admin() AND
    organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()) AND
    (
      role = 'user' OR
      (role = 'secondary_admin' AND can_create_secondary_admin(organization_id))
    )
  );

-- Secondary admins can create users only
CREATE POLICY "Secondary admins can create users"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'secondary_admin' AND
    organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()) AND
    role = 'user'
  );

-- Primary admins can update secondary admins and users in their org
CREATE POLICY "Primary admins can update org users"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    is_primary_admin() AND
    organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- Secondary admins can update regular users in their org
CREATE POLICY "Secondary admins can update users"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'secondary_admin' AND
    organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()) AND
    role = 'user'
  );

-- Super admins can do anything
CREATE POLICY "Super admins can manage all users"
  ON user_profiles FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Step 9: Link primary admins to their organizations
UPDATE organizations o
SET primary_admin_id = (
  SELECT id FROM user_profiles up
  WHERE up.organization_id = o.id
    AND up.role = 'primary_admin'
  LIMIT 1
)
WHERE primary_admin_id IS NULL;

-- Step 10: Create helper function for Super Admin panel
CREATE OR REPLACE FUNCTION list_organizations_with_admins()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  active BOOLEAN,
  risk_count BIGINT,
  primary_admin_email TEXT,
  primary_admin_name TEXT,
  secondary_admin_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.created_at,
    o.active,
    COALESCE(COUNT(DISTINCT r.id), 0) AS risk_count,
    (SELECT email FROM auth.users WHERE id = o.primary_admin_id) AS primary_admin_email,
    (SELECT full_name FROM user_profiles WHERE id = o.primary_admin_id) AS primary_admin_name,
    count_secondary_admins(o.id) AS secondary_admin_count
  FROM organizations o
  LEFT JOIN risks r ON r.organization_id = o.id
  GROUP BY o.id, o.name, o.created_at, o.active, o.primary_admin_id
  ORDER BY o.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION count_secondary_admins(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_primary_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION can_create_secondary_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION list_organizations_with_admins() TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN organizations.primary_admin_id IS 'The primary admin who can create secondary admins (max 3) for this organization';
COMMENT ON FUNCTION count_secondary_admins IS 'Count the number of secondary admins in an organization';
COMMENT ON FUNCTION is_primary_admin IS 'Check if current user is a primary admin of their organization';
COMMENT ON FUNCTION can_create_secondary_admin IS 'Check if primary admin can create another secondary admin (max 3)';
