-- MinRisk Database Schema for Supabase (FIXED)
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABLES (Create all tables first, before policies)
-- =====================================================

-- Organizations/Companies table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- App configuration per organization
CREATE TABLE IF NOT EXISTS app_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  matrix_size INTEGER DEFAULT 5 CHECK (matrix_size IN (5, 6)),
  likelihood_labels JSONB DEFAULT '["Rare", "Unlikely", "Possible", "Likely", "Almost certain"]'::jsonb,
  impact_labels JSONB DEFAULT '["Minimal", "Low", "Moderate", "High", "Severe"]'::jsonb,
  divisions JSONB DEFAULT '["Clearing", "Operations", "Finance"]'::jsonb,
  departments JSONB DEFAULT '["Risk Management", "IT Ops", "Quant/Risk", "Treasury", "Trading"]'::jsonb,
  categories JSONB DEFAULT '["Strategic", "Credit", "Market", "Liquidity", "Operational", "Legal/Compliance", "Technology", "ESG", "Reputational"]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Risks table
CREATE TABLE IF NOT EXISTS risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,
  risk_title TEXT NOT NULL,
  risk_description TEXT,
  division TEXT NOT NULL,
  department TEXT NOT NULL,
  category TEXT NOT NULL,
  owner TEXT NOT NULL,
  likelihood_inherent INTEGER NOT NULL CHECK (likelihood_inherent >= 1 AND likelihood_inherent <= 6),
  impact_inherent INTEGER NOT NULL CHECK (impact_inherent >= 1 AND impact_inherent <= 6),
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Closed')),
  is_priority BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, risk_code)
);

-- Controls table (DIME framework)
CREATE TABLE IF NOT EXISTS controls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id UUID REFERENCES risks(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('Likelihood', 'Impact')),
  design INTEGER DEFAULT 0 CHECK (design >= 0 AND design <= 3),
  implementation INTEGER DEFAULT 0 CHECK (implementation >= 0 AND implementation <= 3),
  monitoring INTEGER DEFAULT 0 CHECK (monitoring >= 0 AND monitoring <= 3),
  effectiveness_evaluation INTEGER DEFAULT 0 CHECK (effectiveness_evaluation >= 0 AND effectiveness_evaluation >= 0 AND effectiveness_evaluation <= 3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_risks_organization ON risks(organization_id);
CREATE INDEX IF NOT EXISTS idx_risks_user ON risks(user_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(category);
CREATE INDEX IF NOT EXISTS idx_controls_risk ON controls(risk_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organization_id);

-- =====================================================
-- 3. SEED DATA (Do this before enabling RLS)
-- =====================================================

-- Insert a default organization (for demo purposes)
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Organization')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_app_configs_updated_at ON app_configs;
CREATE TRIGGER update_app_configs_updated_at BEFORE UPDATE ON app_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_risks_updated_at ON risks;
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON risks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_controls_updated_at ON controls;
CREATE TRIGGER update_controls_updated_at BEFORE UPDATE ON controls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) - Enable and Create Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE controls ENABLE ROW LEVEL SECURITY;

-- Policies for organizations (simplified - allow all authenticated users to view)
DROP POLICY IF EXISTS "Users can view organizations" ON organizations;
CREATE POLICY "Users can view organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (true);

-- Policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Policies for app_configs
DROP POLICY IF EXISTS "Users can view their own configs" ON app_configs;
CREATE POLICY "Users can view their own configs"
  ON app_configs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own configs" ON app_configs;
CREATE POLICY "Users can insert their own configs"
  ON app_configs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own configs" ON app_configs;
CREATE POLICY "Users can update their own configs"
  ON app_configs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for risks (allow users to manage their own risks)
DROP POLICY IF EXISTS "Users can view their own risks" ON risks;
CREATE POLICY "Users can view their own risks"
  ON risks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own risks" ON risks;
CREATE POLICY "Users can insert their own risks"
  ON risks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own risks" ON risks;
CREATE POLICY "Users can update their own risks"
  ON risks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own risks" ON risks;
CREATE POLICY "Users can delete their own risks"
  ON risks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for controls (allow users to manage controls for their own risks)
DROP POLICY IF EXISTS "Users can view controls for their risks" ON controls;
CREATE POLICY "Users can view controls for their risks"
  ON controls FOR SELECT
  TO authenticated
  USING (
    risk_id IN (
      SELECT id FROM risks WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert controls for their risks" ON controls;
CREATE POLICY "Users can insert controls for their risks"
  ON controls FOR INSERT
  TO authenticated
  WITH CHECK (
    risk_id IN (
      SELECT id FROM risks WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update controls for their risks" ON controls;
CREATE POLICY "Users can update controls for their risks"
  ON controls FOR UPDATE
  TO authenticated
  USING (
    risk_id IN (
      SELECT id FROM risks WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete controls for their risks" ON controls;
CREATE POLICY "Users can delete controls for their risks"
  ON controls FOR DELETE
  TO authenticated
  USING (
    risk_id IN (
      SELECT id FROM risks WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- DONE! 🎉
-- =====================================================
-- Now enable Anonymous authentication in the dashboard:
-- https://supabase.com/dashboard/project/cnywkjfkhnwptceluvzs/auth/providers
