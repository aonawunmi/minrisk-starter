-- Review sample events and risks to understand the semantic mismatch
-- Run in Supabase SQL Editor

-- PART 1: Sample Events (what Claude AI needs to match FROM)
SELECT
  '📰 SAMPLE NEWS EVENTS' as info,
  '' as content;

SELECT
  '---' as divider,
  title,
  LEFT(description, 200) as description_preview,
  source_name,
  event_category,
  keywords
FROM external_events
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
)
AND analyzed_at IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- PART 2: Sample Risks (what Claude AI needs to match TO)
SELECT
  '🎯 SAMPLE ORGANIZATIONAL RISKS' as info,
  '' as content;

SELECT
  '---' as divider,
  risk_code,
  risk_title,
  category,
  division,
  department,
  LEFT(risk_description, 200) as risk_description_preview
FROM risks
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
)
ORDER BY RANDOM()
LIMIT 5;
