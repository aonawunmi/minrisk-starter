-- Create news_sources table for managing RSS feed sources
CREATE TABLE IF NOT EXISTS news_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('regulatory', 'market', 'business', 'cybersecurity', 'environmental', 'other')),
  country TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES user_profiles(id),

  UNIQUE(organization_id, url)
);

-- Create index for faster queries
CREATE INDEX idx_news_sources_org_active ON news_sources(organization_id, is_active);
CREATE INDEX idx_news_sources_category ON news_sources(category);

-- Enable RLS
ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view news sources from their organization
CREATE POLICY "Users view org news sources"
ON news_sources FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Admins and editors can insert news sources
CREATE POLICY "Admins/editors insert news sources"
ON news_sources FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'edit')
  )
);

-- Admins and editors can update news sources
CREATE POLICY "Admins/editors update news sources"
ON news_sources FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'edit')
  )
);

-- Admins can delete news sources
CREATE POLICY "Admins delete news sources"
ON news_sources FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Insert default news sources (these will be org-specific after first user logs in)
-- These are marked as defaults and can be used as templates
INSERT INTO news_sources (organization_id, name, url, category, country, is_default) VALUES
-- Get the first organization ID (you'll need to update this with actual org ID)
((SELECT id FROM organizations LIMIT 1), 'Central Bank of Nigeria', 'https://www.cbn.gov.ng/rss/news.xml', 'regulatory', 'Nigeria', true),
((SELECT id FROM organizations LIMIT 1), 'SEC Nigeria', 'https://sec.gov.ng/feed/', 'regulatory', 'Nigeria', true),
((SELECT id FROM organizations LIMIT 1), 'FMDQ Group', 'https://fmdqgroup.com/feed/', 'market', 'Nigeria', true),
((SELECT id FROM organizations LIMIT 1), 'BusinessDay Nigeria', 'https://businessday.ng/feed/', 'business', 'Nigeria', true),
((SELECT id FROM organizations LIMIT 1), 'The Guardian Nigeria', 'https://guardian.ng/feed/', 'business', 'Nigeria', true),
((SELECT id FROM organizations LIMIT 1), 'Premium Times', 'https://www.premiumtimesng.com/feed', 'business', 'Nigeria', true),
((SELECT id FROM organizations LIMIT 1), 'US-CERT Alerts', 'https://www.cisa.gov/cybersecurity-advisories/all.xml', 'cybersecurity', 'Global', true),
((SELECT id FROM organizations LIMIT 1), 'SANS ISC', 'https://isc.sans.edu/rssfeed.xml', 'cybersecurity', 'Global', true),
((SELECT id FROM organizations LIMIT 1), 'UN Environment', 'https://www.unep.org/news-and-stories/rss.xml', 'environmental', 'Global', true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_news_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER news_sources_updated_at
BEFORE UPDATE ON news_sources
FOR EACH ROW
EXECUTE FUNCTION update_news_sources_updated_at();
