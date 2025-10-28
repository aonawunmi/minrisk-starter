-- Diagnostic: Sample events and risks to understand why no matches
-- Run in Supabase SQL Editor

-- 1. Sample of stored events (showing what Claude needs to match)
SELECT
  '=== SAMPLE EVENTS ===' as section,
  NULL as title,
  NULL as description,
  NULL as source,
  NULL as category;

SELECT
  NULL as section,
  title,
  LEFT(description, 150) || '...' as description,
  source_name as source,
  event_category as category
FROM external_events
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
)
AND analyzed_at IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 2. Sample of risks (showing what events should match against)
SELECT
  '=== SAMPLE RISKS ===' as section,
  NULL as code,
  NULL as title,
  NULL as category,
  NULL as description;

SELECT
  NULL as section,
  risk_code as code,
  risk_title as title,
  category,
  LEFT(risk_description, 150) || '...' as description
FROM risks
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
)
ORDER BY RANDOM()
LIMIT 5;

-- 3. Check analysis status
SELECT
  '=== ANALYSIS STATUS ===' as info,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE analyzed_at IS NULL) as unanalyzed,
  COUNT(*) FILTER (WHERE analyzed_at IS NOT NULL) as analyzed
FROM external_events
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
);

-- 4. Check alerts
SELECT
  '=== ALERTS ===' as info,
  COUNT(*) as total_alerts
FROM risk_intelligence_alerts
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
);
