-- Add better news sources for risk intelligence testing
-- These sources are more relevant to financial services, cybersecurity, and regulatory compliance
-- Run this in Supabase SQL Editor

-- Get your organization_id
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get organization_id for the user
  SELECT organization_id INTO v_org_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1);

  -- Disable current general news sources (they're not specific enough)
  UPDATE news_sources
  SET is_active = false
  WHERE organization_id = v_org_id;

  -- Insert targeted financial and risk news sources
  INSERT INTO news_sources (organization_id, name, url, country, category, is_active) VALUES

  -- Cybersecurity News
  (v_org_id, 'Krebs on Security', 'https://krebsonsecurity.com/feed/', 'USA', 'cybersecurity', true),
  (v_org_id, 'The Hacker News', 'https://feeds.feedburner.com/TheHackersNews', 'USA', 'cybersecurity', true),
  (v_org_id, 'Bleeping Computer Security', 'https://www.bleepingcomputer.com/feed/', 'USA', 'cybersecurity', true),
  (v_org_id, 'Dark Reading', 'https://www.darkreading.com/rss.xml', 'USA', 'cybersecurity', true),

  -- Financial Services & Business
  (v_org_id, 'Reuters Business News', 'https://feeds.reuters.com/reuters/businessNews', 'Global', 'business', true),
  (v_org_id, 'Wall Street Journal Markets', 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', 'USA', 'market', true),

  -- Regulatory & Compliance
  (v_org_id, 'SEC Press Releases', 'https://www.sec.gov/news/pressreleases.rss', 'USA', 'regulatory', true),
  (v_org_id, 'FINRA Newsroom', 'https://www.finra.org/rss/news-feed.xml', 'USA', 'regulatory', true),

  -- Risk Management & Technology
  (v_org_id, 'TechCrunch Security', 'https://techcrunch.com/category/security/feed/', 'USA', 'cybersecurity', true),

  -- African/Nigerian Financial News
  (v_org_id, 'Business Day Nigeria', 'https://businessday.ng/feed/', 'Nigeria', 'business', true),
  (v_org_id, 'The Guardian Nigeria Business', 'https://guardian.ng/category/business-services/feed/', 'Nigeria', 'business', true),
  (v_org_id, 'Premium Times Nigeria Business', 'https://www.premiumtimesng.com/business/feed', 'Nigeria', 'business', true),
  (v_org_id, 'African Business Magazine', 'https://african.business/feed/', 'Africa', 'business', true)

  ON CONFLICT (organization_id, url) DO UPDATE
  SET is_active = true, name = EXCLUDED.name, category = EXCLUDED.category;

  RAISE NOTICE '✅ Added 13 better news sources for organization %', v_org_id;
END $$;

-- Verify the new sources
SELECT
  name,
  country,
  category,
  is_active,
  created_at
FROM news_sources
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
)
ORDER BY is_active DESC, category, name;
