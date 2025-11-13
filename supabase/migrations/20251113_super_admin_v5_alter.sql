-- Migration: Add Super Admin functionality (v5 - Works with existing organizations table)
-- Date: 2025-11-13
-- Purpose: Enable super admins to manage multiple organizations
-- Works with Supabase Auth and existing organizations table from ERM reporting

-- STEP 1: Add 'active' column to existing organizations table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'active'
  ) THEN
    ALTER TABLE organizations ADD COLUMN active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- STEP 2: Create function to check if user is super admin
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

-- STEP 3: Create function to list all organizations with stats
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

-- STEP 4: Enable RLS on organizations (if not already enabled)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- STEP 5: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;

-- STEP 6: Create RLS policies
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

-- STEP 7: Create indexes (if not already exist)
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(active);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

-- STEP 8: Update any existing organizations to be active (if they don't have value set)
UPDATE organizations
SET active = TRUE
WHERE active IS NULL;

-- STEP 9: Add helpful comments
COMMENT ON TABLE organizations IS 'Stores all client organizations in the multi-tenant system (also used for ERM reporting)';
COMMENT ON COLUMN organizations.active IS 'Whether the organization is active. Inactive organizations cannot access the system.';
COMMENT ON FUNCTION is_super_admin IS 'Checks if current user is a super admin via user_metadata';
COMMENT ON FUNCTION list_organizations IS 'Lists all organizations with risk counts. Only accessible to super admins.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Super Admin migration completed successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Make yourself a super admin by updating auth.users user_metadata';
  RAISE NOTICE '2. Test the is_super_admin() function';
  RAISE NOTICE '3. Test the list_organizations() function';
END $$;
