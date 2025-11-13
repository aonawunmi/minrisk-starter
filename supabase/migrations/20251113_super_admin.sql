-- Migration: Add Super Admin functionality
-- Date: 2025-11-13
-- Purpose: Enable super admins to manage multiple organizations

-- 1. Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- 2. Add super_admin column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='users' AND column_name='is_super_admin') THEN
    ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 3. Create function to create new organization with admin user
CREATE OR REPLACE FUNCTION create_organization_with_admin(
  org_name TEXT,
  admin_email TEXT,
  admin_password TEXT
) RETURNS JSON AS $$
DECLARE
  new_org_id UUID;
  result JSON;
BEGIN
  -- Create organization
  INSERT INTO organizations (name, is_active)
  VALUES (org_name, TRUE)
  RETURNING id INTO new_org_id;

  -- Return success with org_id
  -- Note: User creation must be done via Supabase Auth API (cannot be done in SQL)
  result := json_build_object(
    'success', TRUE,
    'organization_id', new_org_id,
    'organization_name', org_name,
    'admin_email', admin_email,
    'message', 'Organization created. Admin user must be created via Supabase Auth.'
  );

  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', FALSE,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to list all organizations
CREATE OR REPLACE FUNCTION list_organizations()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  is_active BOOLEAN,
  user_count BIGINT,
  risk_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.created_at,
    o.is_active,
    COUNT(DISTINCT u.id) AS user_count,
    COUNT(DISTINCT r.id) AS risk_count
  FROM organizations o
  LEFT JOIN users u ON u.organization_id = o.id
  LEFT JOIN risks r ON r.organization_id = o.id
  GROUP BY o.id, o.name, o.created_at, o.is_active
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to toggle organization active status
CREATE OR REPLACE FUNCTION toggle_organization_status(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  new_status BOOLEAN;
BEGIN
  UPDATE organizations
  SET is_active = NOT is_active,
      updated_at = NOW()
  WHERE id = org_id
  RETURNING is_active INTO new_status;

  RETURN new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create RLS policies for organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Super admins can see all organizations
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = TRUE
    )
  );

-- Super admins can insert organizations
CREATE POLICY "Super admins can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = TRUE
    )
  );

-- Super admins can update organizations
CREATE POLICY "Super admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = TRUE
    )
  );

-- 7. Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_super_admin ON users(is_super_admin) WHERE is_super_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);

-- 8. Insert default organization if none exists
INSERT INTO organizations (name, is_active)
SELECT 'Default Organization', TRUE
WHERE NOT EXISTS (SELECT 1 FROM organizations LIMIT 1);

COMMENT ON TABLE organizations IS 'Stores all client organizations in the multi-tenant system';
COMMENT ON COLUMN users.is_super_admin IS 'Super admins can manage all organizations';
COMMENT ON FUNCTION create_organization_with_admin IS 'Creates a new organization. User creation must be done separately via Supabase Auth.';
