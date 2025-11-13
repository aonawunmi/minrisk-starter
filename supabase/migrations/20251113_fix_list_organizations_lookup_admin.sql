-- Fix list_organizations_with_admins to look up Primary Admin from user_profiles table
-- The organizations table doesn't have primary_admin_id, so we need to find it via user_profiles

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
    (
      SELECT auth.users.email::TEXT
      FROM user_profiles
      INNER JOIN auth.users ON auth.users.id = user_profiles.id
      WHERE user_profiles.organization_id = o.id
        AND user_profiles.role = 'primary_admin'
      LIMIT 1
    ) AS primary_admin_email,
    (
      SELECT user_profiles.full_name::TEXT
      FROM user_profiles
      WHERE user_profiles.organization_id = o.id
        AND user_profiles.role = 'primary_admin'
      LIMIT 1
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

-- Verify the function works
SELECT * FROM list_organizations_with_admins();
