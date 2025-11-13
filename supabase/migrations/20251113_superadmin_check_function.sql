-- Create a reliable way to check if current user is Super Admin
-- This is database-driven and doesn't rely on auth metadata

-- Add is_super_admin column to user_profiles if it doesn't exist
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Set the Super Admin flag for ayodele.onawunmi@gmail.com
UPDATE user_profiles
SET is_super_admin = TRUE
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@gmail.com'
);

-- Create a function to check if current user is Super Admin
CREATE OR REPLACE FUNCTION check_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(is_super_admin, FALSE)
  FROM user_profiles
  WHERE id = auth.uid();
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_is_super_admin() TO authenticated;

-- Verify the setup
SELECT
  up.id,
  u.email,
  up.is_super_admin
FROM user_profiles up
JOIN auth.users u ON u.id = up.id
WHERE up.is_super_admin = TRUE;
