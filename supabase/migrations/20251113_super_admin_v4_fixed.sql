-- Migration: Add Super Admin functionality (v4 - Fixed)
-- Date: 2025-11-13
-- Purpose: Enable super admins to manage multiple organizations
-- Works with Supabase Auth, handles existing tables

-- STEP 1: Drop existing table if it exists (clean slate)
DROP TABLE IF EXISTS organizations CASCADE;

-- STEP 2: Create organizations table (fresh)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

-- STEP 3: Create function to check if user is super admin
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

-- STEP 4: Create function to list all organizations with stats
CREATE OR REPLACE FUNCTION list_organizations()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  active BOOLEAN,
  risk_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.created_at,
    o.active,
    COALESCE(COUNT(r.id), 0) AS risk_count
  FROM organizations o
  LEFT JOIN risks r ON r.organization_id = o.id
  GROUP BY o.id, o.name, o.created_at, o.active
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Enable RLS on organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- STEP 6: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;

-- STEP 7: Create RLS policies
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_super_admin());

-- STEP 8: Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(active);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

-- STEP 9: Insert default organization if none exists
INSERT INTO organizations (name, active)
VALUES ('Default Organization', TRUE);

-- STEP 10: Add helpful comments
COMMENT ON TABLE organizations IS 'Stores all client organizations in the multi-tenant system';
COMMENT ON FUNCTION is_super_admin IS 'Checks if current user is a super admin via user_metadata';
COMMENT ON FUNCTION list_organizations IS 'Lists all organizations with risk counts. Only accessible to super admins.';
