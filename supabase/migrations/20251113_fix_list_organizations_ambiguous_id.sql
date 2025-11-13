-- Fix ambiguous "id" column reference in list_organizations_with_admins function
-- The error occurs because both organizations (o) and risks (r) tables have an "id" column

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
    (SELECT email FROM auth.users WHERE auth.users.id = o.primary_admin_id) AS primary_admin_email,
    (SELECT full_name FROM user_profiles WHERE user_profiles.id = o.primary_admin_id) AS primary_admin_name,
    count_secondary_admins(o.id) AS secondary_admin_count
  FROM organizations o
  LEFT JOIN risks r ON r.organization_id = o.id
  GROUP BY o.id, o.name, o.created_at, o.active, o.primary_admin_id
  ORDER BY o.created_at DESC;
END;
$$;

-- Verify the function works
SELECT * FROM list_organizations_with_admins();
