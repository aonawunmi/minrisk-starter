-- Create risk_keywords table for managing custom risk-related keywords
CREATE TABLE IF NOT EXISTS risk_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category TEXT CHECK (category IN ('financial', 'cyber', 'compliance', 'operational', 'environmental', 'general')),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES user_profiles(id),

  UNIQUE(organization_id, keyword)
);

-- Create index for faster queries
CREATE INDEX idx_risk_keywords_org_active ON risk_keywords(organization_id, is_active);
CREATE INDEX idx_risk_keywords_category ON risk_keywords(category);

-- Enable RLS
ALTER TABLE risk_keywords ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view keywords from their organization
CREATE POLICY "Users view org risk keywords"
ON risk_keywords FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Admins and editors can insert keywords
CREATE POLICY "Admins/editors insert risk keywords"
ON risk_keywords FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'edit')
  )
);

-- Admins and editors can update keywords
CREATE POLICY "Admins/editors update risk keywords"
ON risk_keywords FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'edit')
  )
);

-- Admins can delete keywords
CREATE POLICY "Admins delete risk keywords"
ON risk_keywords FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Insert default risk keywords (these will be org-specific)
INSERT INTO risk_keywords (organization_id, keyword, category, is_default) VALUES
-- Financial keywords
((SELECT id FROM organizations LIMIT 1), 'risk', 'financial', true),
((SELECT id FROM organizations LIMIT 1), 'fraud', 'financial', true),
((SELECT id FROM organizations LIMIT 1), 'financial loss', 'financial', true),
((SELECT id FROM organizations LIMIT 1), 'market volatility', 'financial', true),
((SELECT id FROM organizations LIMIT 1), 'credit risk', 'financial', true),
((SELECT id FROM organizations LIMIT 1), 'liquidity', 'financial', true),
((SELECT id FROM organizations LIMIT 1), 'default', 'financial', true),
((SELECT id FROM organizations LIMIT 1), 'bankruptcy', 'financial', true),

-- Cyber keywords
((SELECT id FROM organizations LIMIT 1), 'threat', 'cyber', true),
((SELECT id FROM organizations LIMIT 1), 'vulnerability', 'cyber', true),
((SELECT id FROM organizations LIMIT 1), 'breach', 'cyber', true),
((SELECT id FROM organizations LIMIT 1), 'attack', 'cyber', true),
((SELECT id FROM organizations LIMIT 1), 'cybersecurity', 'cyber', true),
((SELECT id FROM organizations LIMIT 1), 'data breach', 'cyber', true),
((SELECT id FROM organizations LIMIT 1), 'ransomware', 'cyber', true),
((SELECT id FROM organizations LIMIT 1), 'phishing', 'cyber', true),

-- Compliance keywords
((SELECT id FROM organizations LIMIT 1), 'compliance', 'compliance', true),
((SELECT id FROM organizations LIMIT 1), 'regulation', 'compliance', true),
((SELECT id FROM organizations LIMIT 1), 'penalty', 'compliance', true),
((SELECT id FROM organizations LIMIT 1), 'fine', 'compliance', true),
((SELECT id FROM organizations LIMIT 1), 'sanction', 'compliance', true),
((SELECT id FROM organizations LIMIT 1), 'audit', 'compliance', true),
((SELECT id FROM organizations LIMIT 1), 'control', 'compliance', true),
((SELECT id FROM organizations LIMIT 1), 'governance', 'compliance', true),

-- Operational keywords
((SELECT id FROM organizations LIMIT 1), 'operational', 'operational', true),
((SELECT id FROM organizations LIMIT 1), 'disruption', 'operational', true),
((SELECT id FROM organizations LIMIT 1), 'outage', 'operational', true),
((SELECT id FROM organizations LIMIT 1), 'failure', 'operational', true),

-- Environmental keywords
((SELECT id FROM organizations LIMIT 1), 'environmental', 'environmental', true),
((SELECT id FROM organizations LIMIT 1), 'climate', 'environmental', true),
((SELECT id FROM organizations LIMIT 1), 'ESG', 'environmental', true),
((SELECT id FROM organizations LIMIT 1), 'sustainability', 'environmental', true),

-- General keywords
((SELECT id FROM organizations LIMIT 1), 'reputation', 'general', true),
((SELECT id FROM organizations LIMIT 1), 'scandal', 'general', true),
((SELECT id FROM organizations LIMIT 1), 'investigation', 'general', true);
