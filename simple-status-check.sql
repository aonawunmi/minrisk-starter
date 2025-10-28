-- Simple status check - single query shows everything
-- Run in Supabase SQL Editor

WITH org AS (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
)
SELECT
  'EVENTS' as metric,
  (SELECT COUNT(*) FROM external_events WHERE organization_id = (SELECT organization_id FROM org)) as total,
  (SELECT COUNT(*) FROM external_events WHERE organization_id = (SELECT organization_id FROM org) AND analyzed_at IS NULL) as unanalyzed,
  (SELECT COUNT(*) FROM external_events WHERE organization_id = (SELECT organization_id FROM org) AND analyzed_at IS NOT NULL) as already_analyzed
UNION ALL
SELECT
  'RISKS',
  (SELECT COUNT(*) FROM risks WHERE organization_id = (SELECT organization_id FROM org)),
  (SELECT COUNT(*) FROM risks WHERE organization_id = (SELECT organization_id FROM org) AND risk_code LIKE 'STR-%'),
  NULL
UNION ALL
SELECT
  'ALERTS',
  (SELECT COUNT(*) FROM risk_intelligence_alerts WHERE organization_id = (SELECT organization_id FROM org)),
  (SELECT COUNT(*) FROM risk_intelligence_alerts WHERE organization_id = (SELECT organization_id FROM org) AND created_at > NOW() - INTERVAL '1 hour'),
  NULL;
