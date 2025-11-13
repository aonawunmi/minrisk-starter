-- Migration: Super Admin Read-Only Access
-- Super Admin can ONLY:
-- 1. View all data across organizations (read-only)
-- 2. Manage organizations (create, activate/deactivate)
-- 3. Manage Primary Admins (assign, change)
-- Super Admin CANNOT:
-- - Create/edit/delete risks
-- - Create/edit/delete regular users (only Primary Admins)
-- - Make operational changes to organization data

-- Step 1: Update RLS policies for risks table - Super Admin is READ-ONLY
DROP POLICY IF EXISTS "Super admins can manage all risks" ON risks;

-- Super admins can VIEW all risks (read-only)
CREATE POLICY "Super admins can view all risks"
  ON risks FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins CANNOT insert risks
-- Super admins CANNOT update risks
-- Super admins CANNOT delete risks
-- (No policies = no access)

-- Step 2: Update RLS policies for user_profiles - Super Admin can only manage admins
-- Drop the blanket "manage all users" policy
DROP POLICY IF EXISTS "Super admins can manage all users" ON user_profiles;

-- Super admins can VIEW all users
CREATE POLICY "Super admins can view all users"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can UPDATE user_profiles ONLY to:
-- 1. Change role to/from primary_admin
-- 2. Change organization_id for primary admins
CREATE POLICY "Super admins can manage primary admins only"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    is_super_admin() AND
    (role = 'primary_admin' OR (
      SELECT role FROM user_profiles WHERE id = auth.uid()
    ) = 'primary_admin')
  )
  WITH CHECK (
    is_super_admin() AND
    role IN ('primary_admin', 'user') -- Can't create secondary_admins directly
  );

-- Super admins CANNOT INSERT new users directly
-- (Organizations must invite users via Supabase Auth)

-- Super admins CANNOT DELETE users
-- (Must be done via Supabase Dashboard for safety)

-- Step 3: Super Admin can fully manage organizations table
-- (This is already correct from previous migration)

-- Step 4: Create view for Super Admin dashboard analytics
CREATE OR REPLACE FUNCTION get_super_admin_analytics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Only super admins can access analytics
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super admin only';
  END IF;

  SELECT jsonb_build_object(
    'total_organizations', (SELECT COUNT(*) FROM organizations),
    'active_organizations', (SELECT COUNT(*) FROM organizations WHERE active = TRUE),
    'inactive_organizations', (SELECT COUNT(*) FROM organizations WHERE active = FALSE),
    'total_risks', (SELECT COUNT(*) FROM risks),
    'total_users', (SELECT COUNT(*) FROM user_profiles),
    'total_primary_admins', (SELECT COUNT(*) FROM user_profiles WHERE role = 'primary_admin'),
    'total_secondary_admins', (SELECT COUNT(*) FROM user_profiles WHERE role = 'secondary_admin'),
    'total_regular_users', (SELECT COUNT(*) FROM user_profiles WHERE role = 'user'),
    'risks_by_status', (
      SELECT jsonb_object_agg(status, count)
      FROM (
        SELECT status, COUNT(*) as count
        FROM risks
        GROUP BY status
      ) AS status_counts
    ),
    'organizations_with_most_risks', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'organization_name', o.name,
          'risk_count', COUNT(r.id)
        )
        ORDER BY COUNT(r.id) DESC
        LIMIT 5
      )
      FROM organizations o
      LEFT JOIN risks r ON r.organization_id = o.id
      GROUP BY o.id, o.name
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Step 5: Add comments to clarify Super Admin permissions
COMMENT ON POLICY "Super admins can view all risks" ON risks IS
  'Super Admins have READ-ONLY access to all risks across organizations for monitoring purposes';

COMMENT ON POLICY "Super admins can manage primary admins only" ON user_profiles IS
  'Super Admins can only update Primary Admin assignments, not create/edit regular users or risks';

COMMENT ON FUNCTION get_super_admin_analytics IS
  'Provides read-only analytics dashboard data for Super Admin monitoring';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_super_admin_analytics() TO authenticated;

-- Step 6: Ensure existing policies don't give Super Admin write access
-- Check user_profiles policies
DO $$
BEGIN
  -- Verify no policies allow Super Admin to INSERT regular users
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles'
      AND policyname LIKE '%super%admin%'
      AND cmd = 'INSERT'
  ) THEN
    RAISE WARNING 'Found Super Admin INSERT policy on user_profiles - this may need review';
  END IF;
END $$;
