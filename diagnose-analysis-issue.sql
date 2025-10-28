-- Diagnose why analysis is finding ZERO events or creating ZERO alerts
-- Run in Supabase SQL Editor

-- 1. Check if events exist and their analysis status
SELECT
  '=== EVENTS STATUS ===' as section,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE analyzed_at IS NULL) as ready_to_analyze,
  COUNT(*) FILTER (WHERE analyzed_at IS NOT NULL) as already_analyzed
FROM external_events
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
);

-- 2. Show sample of unanalyzed events (if any)
SELECT
  '=== UNANALYZED EVENTS ===' as section,
  NULL as source,
  NULL as title,
  NULL as category;

SELECT
  NULL as section,
  source_name as source,
  LEFT(title, 80) as title,
  event_category as category
FROM external_events
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
)
AND analyzed_at IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- 3. Show sample of recently analyzed events (if any)
SELECT
  '=== RECENTLY ANALYZED EVENTS ===' as section,
  NULL as source,
  NULL as title,
  NULL as analyzed_time;

SELECT
  NULL as section,
  source_name as source,
  LEFT(title, 80) as title,
  analyzed_at as analyzed_time
FROM external_events
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
)
AND analyzed_at IS NOT NULL
ORDER BY analyzed_at DESC
LIMIT 5;

-- 4. Check strategic risks exist
SELECT
  '=== STRATEGIC RISKS ===' as section,
  COUNT(*) as total_strategic_risks
FROM risks
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
)
AND risk_code LIKE 'STR-%';

-- 5. Check if any alerts were ever created
SELECT
  '=== ALERTS ===' as section,
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as alerts_last_hour
FROM risk_intelligence_alerts
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
);

-- 6. Show actual event content to verify quality
SELECT
  '=== SAMPLE EVENT CONTENT ===' as section,
  NULL as title,
  NULL as description;

SELECT
  NULL as section,
  title,
  LEFT(description, 300) as description
FROM external_events
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
)
ORDER BY created_at DESC
LIMIT 3;
