-- Run this in Supabase SQL Editor to see how many unanalyzed events you have
SELECT
  COUNT(*) FILTER (WHERE analyzed_at IS NULL) as unanalyzed_events,
  COUNT(*) FILTER (WHERE analyzed_at IS NOT NULL) as analyzed_events,
  COUNT(*) as total_events
FROM external_events
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
);
