-- MinRisk Database Schema - MINIMAL VERSION (No RLS Issues)
-- This version creates tables WITHOUT Row Level Security first
-- We'll add RLS policies after verifying tables exist

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 1: DROP EXISTING TABLES (if any) to start fresh
-- =====================================================
DROP TABLE IF EXISTS controls CASCADE;
DROP TABLE IF EXISTS risks CASCADE;
DROP TABLE IF EXISTS app_configs CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- =====================================================
-- STEP 2: CREATE TABLES
-- =====================================================

-- Organizations/Companies table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- App configuration per organization
CREATE TABLE app_configs (
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
CREATE TABLE risks (
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
CREATE TABLE controls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id UUID REFERENCES risks(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('Likelihood', 'Impact')),
  design INTEGER DEFAULT 0 CHECK (design >= 0 AND design <= 3),
  implementation INTEGER DEFAULT 0 CHECK (implementation >= 0 AND implementation <= 3),
  monitoring INTEGER DEFAULT 0 CHECK (monitoring >= 0 AND monitoring <= 3),
  effectiveness_evaluation INTEGER DEFAULT 0 CHECK (effectiveness_evaluation >= 0 AND effectiveness_evaluation <= 3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 3: CREATE INDEXES
-- =====================================================

CREATE INDEX idx_risks_organization ON risks(organization_id);
CREATE INDEX idx_risks_user ON risks(user_id);
CREATE INDEX idx_risks_status ON risks(status);
CREATE INDEX idx_risks_category ON risks(category);
CREATE INDEX idx_controls_risk ON controls(risk_id);
CREATE INDEX idx_user_profiles_org ON user_profiles(organization_id);

-- =====================================================
-- STEP 4: INSERT SEED DATA
-- =====================================================

INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Organization');

-- =====================================================
-- STEP 5: CREATE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_configs_updated_at BEFORE UPDATE ON app_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON risks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_controls_updated_at BEFORE UPDATE ON controls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE controls ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 7: CREATE RLS POLICIES (Simplified - User-based only)
-- =====================================================

-- Organizations: Allow all authenticated users to view
CREATE POLICY "allow_authenticated_select" ON organizations
  FOR SELECT TO authenticated USING (true);

-- User Profiles: Users can only see and modify their own profile
CREATE POLICY "allow_own_profile_select" ON user_profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "allow_own_profile_insert" ON user_profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "allow_own_profile_update" ON user_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- App Configs: Users can only see and modify their own configs
CREATE POLICY "allow_own_config_select" ON app_configs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "allow_own_config_insert" ON app_configs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "allow_own_config_update" ON app_configs
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Risks: Users can only see and modify their own risks
CREATE POLICY "allow_own_risks_select" ON risks
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "allow_own_risks_insert" ON risks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "allow_own_risks_update" ON risks
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "allow_own_risks_delete" ON risks
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Controls: Users can only see and modify controls for their own risks
CREATE POLICY "allow_own_controls_select" ON controls
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM risks WHERE risks.id = controls.risk_id AND risks.user_id = auth.uid()));

CREATE POLICY "allow_own_controls_insert" ON controls
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM risks WHERE risks.id = controls.risk_id AND risks.user_id = auth.uid()));

CREATE POLICY "allow_own_controls_update" ON controls
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM risks WHERE risks.id = controls.risk_id AND risks.user_id = auth.uid()));

CREATE POLICY "allow_own_controls_delete" ON controls
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM risks WHERE risks.id = controls.risk_id AND risks.user_id = auth.uid()));

-- =====================================================
-- ✅ DONE! Database setup complete
-- =====================================================
-- Next step: Enable Anonymous authentication at:
-- https://supabase.com/dashboard/project/cnywkjfkhnwptceluvzs/auth/providers
