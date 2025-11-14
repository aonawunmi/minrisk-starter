-- Fix list_organizations_with_admins to show invited user email even before they accept
-- Invited users exist in auth.users with organization_id in raw_user_meta_data
-- but don't have user_profiles records until they complete signup

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
    COALESCE(COUNT(DISTINCT r.id), 0)::BIGINT AS risk_count,
    COALESCE(
      -- First try to get from user_profiles (for users who completed signup)
      (
        SELECT auth.users.email::TEXT
        FROM user_profiles
        INNER JOIN auth.users ON auth.users.id = user_profiles.id
        WHERE user_profiles.organization_id = o.id
          AND user_profiles.role = 'primary_admin'
        LIMIT 1
      ),
      -- Fallback: get from auth.users metadata (for invited but not yet signed up users)
      (
        SELECT email::TEXT
        FROM auth.users
        WHERE raw_user_meta_data->>'organization_id' = o.id::TEXT
          AND raw_user_meta_data->>'organization_name' = o.name
        LIMIT 1
      )
    ) AS primary_admin_email,
    COALESCE(
      -- Try to get name from user_profiles first
      (
        SELECT user_profiles.full_name::TEXT
        FROM user_profiles
        WHERE user_profiles.organization_id = o.id
          AND user_profiles.role = 'primary_admin'
        LIMIT 1
      ),
      -- Fallback to extracting from email
      (
        SELECT SPLIT_PART(email, '@', 1)::TEXT
        FROM auth.users
        WHERE raw_user_meta_data->>'organization_id' = o.id::TEXT
          AND raw_user_meta_data->>'organization_name' = o.name
        LIMIT 1
      )
    ) AS primary_admin_name,
    (
      SELECT COUNT(*)::INTEGER
      FROM user_profiles
      WHERE user_profiles.organization_id = o.id
        AND user_profiles.role = 'secondary_admin'
    ) AS secondary_admin_count
  FROM organizations o
  LEFT JOIN risks r ON r.organization_id = o.id
  GROUP BY o.id, o.name, o.created_at, o.active
  ORDER BY o.created_at DESC;
END;
$$;

-- Test the function
SELECT * FROM list_organizations_with_admins();
