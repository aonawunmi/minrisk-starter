-- Add Strategic/External Risks for Intelligence Monitoring
-- These risks are designed to match industry news and external events
-- Run in Supabase SQL Editor

DO $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  -- Get organization_id and user_id
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1;
  SELECT organization_id INTO v_org_id FROM user_profiles WHERE id = v_user_id;

  -- Insert strategic risks that match news categories
  INSERT INTO risks (
    organization_id,
    user_id,
    risk_code,
    risk_title,
    risk_description,
    division,
    department,
    category,
    owner,
    likelihood_inherent,
    impact_inherent,
    status,
    is_priority
  ) VALUES

  -- Cybersecurity Strategic Risks
  (
    v_org_id,
    v_user_id,
    'STR-CYB-001',
    'Increased Cyber Threat Landscape',
    'Escalating sophistication and frequency of cyber attacks targeting financial market infrastructure globally, including ransomware, phishing, and DDoS attacks, potentially affecting FMDQ operations and member confidence.',
    'Operations',
    'Information Technology',
    'Technology',
    'Chief Information Security Officer',
    4,
    5,
    'Open',
    true
  ),
  (
    v_org_id,
    v_user_id,
    'STR-CYB-002',
    'Third-Party Vendor Security Incidents',
    'Cybersecurity breaches or operational failures at critical technology vendors (e.g., CitiDirect, Bloomberg, Reuters) affecting service delivery and creating systemic vulnerabilities in the financial services ecosystem.',
    'Operations',
    'Vendor Management',
    'Technology',
    'Chief Operating Officer',
    4,
    4,
    'Open',
    true
  ),

  -- Regulatory Strategic Risks
  (
    v_org_id,
    v_user_id,
    'STR-REG-001',
    'Evolving Regulatory Compliance Requirements',
    'Introduction of new or amended regulations by SEC Nigeria, CBN, or international bodies (IOSCO, FSB) requiring significant operational changes, system upgrades, and enhanced reporting capabilities.',
    'Compliance',
    'Regulatory Affairs',
    'Regulatory',
    'Head of Compliance',
    5,
    4,
    'Open',
    true
  ),
  (
    v_org_id,
    v_user_id,
    'STR-REG-002',
    'Cross-Border Regulatory Divergence',
    'Increasing divergence between Nigerian and international regulatory standards affecting cross-border trading, foreign investment flows, and operational complexity for international members.',
    'Compliance',
    'Legal & Regulatory',
    'Regulatory',
    'Head of Legal',
    3,
    4,
    'Open',
    false
  ),

  -- Market Strategic Risks
  (
    v_org_id,
    v_user_id,
    'STR-MKT-001',
    'Member Firm Financial Distress',
    'Deteriorating financial condition of clearing members due to market volatility, liquidity constraints, or economic downturn, increasing default risk and potential contagion effects across the trading ecosystem.',
    'Clearing Risk',
    'Risk Management',
    'Financial',
    'Chief Risk Officer',
    4,
    5,
    'Open',
    true
  ),
  (
    v_org_id,
    v_user_id,
    'STR-MKT-002',
    'Market Structure Changes',
    'Structural shifts in Nigerian capital markets including new trading venues, alternative trading systems, or disintermediation threatening FMDQ market share and revenue streams.',
    'Strategy',
    'Business Development',
    'Strategic',
    'Chief Executive Officer',
    3,
    4,
    'Open',
    false
  ),

  -- Operational Strategic Risks
  (
    v_org_id,
    v_user_id,
    'STR-OPE-001',
    'Industry-Wide Technology Disruptions',
    'Widespread technology failures affecting financial market infrastructure (payment systems, trading platforms, data providers) causing cascading operational impacts and settlement delays across the industry.',
    'Operations',
    'Technology Operations',
    'Technology',
    'Chief Technology Officer',
    3,
    5,
    'Open',
    true
  ),
  (
    v_org_id,
    v_user_id,
    'STR-OPE-002',
    'Talent Retention in Competitive Market',
    'Difficulty attracting and retaining skilled professionals due to competitive job market, brain drain, and evolving technology requirements, impacting operational excellence and innovation capacity.',
    'Human Resources',
    'HR & Talent',
    'Human Resources',
    'Head of Human Resources',
    4,
    3,
    'Open',
    false
  ),

  -- Reputational Strategic Risks
  (
    v_org_id,
    v_user_id,
    'STR-REP-001',
    'Reputational Damage from Industry Incidents',
    'Negative perception of Nigerian financial markets due to high-profile fraud cases, market manipulation, or operational failures at peer institutions affecting investor confidence and FMDQ brand.',
    'Corporate Affairs',
    'Communications',
    'Reputational',
    'Head of Corporate Communications',
    3,
    4,
    'Open',
    true
  ),

  -- Environmental/ESG Strategic Risks
  (
    v_org_id,
    v_user_id,
    'STR-ESG-001',
    'ESG Compliance and Reporting Pressures',
    'Growing investor and regulatory pressure for Environmental, Social, and Governance (ESG) compliance, sustainability reporting, and green finance initiatives requiring operational changes and strategic repositioning.',
    'Strategy',
    'Sustainability',
    'Strategic',
    'Chief Strategy Officer',
    4,
    3,
    'Open',
    false
  )

  ON CONFLICT (organization_id, risk_code) DO UPDATE
  SET
    risk_title = EXCLUDED.risk_title,
    risk_description = EXCLUDED.risk_description,
    updated_at = NOW();

  RAISE NOTICE '✅ Added 10 strategic risks for organization %', v_org_id;
END $$;

-- Verify the new strategic risks
SELECT
  risk_code,
  risk_title,
  category,
  division,
  likelihood_inherent,
  impact_inherent,
  is_priority
FROM risks
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
)
AND risk_code LIKE 'STR-%'
ORDER BY risk_code;
