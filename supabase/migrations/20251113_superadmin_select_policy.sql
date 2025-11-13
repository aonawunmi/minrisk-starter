-- Add SELECT policy for Super Admin to read their own is_super_admin flag
-- This is critical for the frontend to detect Super Admin status

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Super admins can view all user profiles" ON user_profiles;

-- Super admins can VIEW all user profiles (read-only)
-- This allows them to:
-- 1. Check their own is_super_admin flag
-- 2. View Primary Admin assignments
-- 3. View user list for organizations
CREATE POLICY "Super admins can view all user profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Verification: Check policies on user_profiles
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
  AND policyname LIKE '%super%admin%';
