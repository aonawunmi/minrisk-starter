-- Migration: Add Super Admin functionality (Supabase Auth Edition)
-- Date: 2025-11-13
-- Purpose: Enable super admins to manage multiple organizations
-- Works with Supabase Auth (no custom users table)

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- 2. Create function to list all organizations with stats
CREATE OR REPLACE FUNCTION list_organizations()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  is_active BOOLEAN,
  risk_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.created_at,
    o.is_active,
    COUNT(DISTINCT r.id) AS risk_count
  FROM organizations o
  LEFT JOIN risks r ON r.organization_id = o.id
  GROUP BY o.id, o.name, o.created_at, o.is_active
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to toggle organization active status
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

-- 4. Create function to check if user is super admin
-- Super admin is determined by user_metadata in auth.users
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT (raw_user_meta_data->>'is_super_admin')::BOOLEAN
     FROM auth.users
     WHERE id = auth.uid()),
    FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create RLS policies for organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;

-- Super admins can see all organizations
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can insert organizations
CREATE POLICY "Super admins can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- Super admins can update organizations
CREATE POLICY "Super admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_super_admin());

-- 6. Create index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

-- 7. Insert default organization if none exists
INSERT INTO organizations (name, is_active)
SELECT 'Default Organization', TRUE
WHERE NOT EXISTS (SELECT 1 FROM organizations LIMIT 1);

-- 8. Add helpful comments
COMMENT ON TABLE organizations IS 'Stores all client organizations in the multi-tenant system';
COMMENT ON FUNCTION is_super_admin IS 'Checks if current user is a super admin by reading user_metadata from auth.users';
COMMENT ON FUNCTION list_organizations IS 'Lists all organizations with statistics (risk counts). Only accessible to super admins.';
COMMENT ON FUNCTION toggle_organization_status IS 'Toggles the is_active status of an organization. Only accessible to super admins.';
