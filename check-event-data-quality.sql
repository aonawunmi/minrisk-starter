-- Check if event descriptions are actually populated
-- This will show us what Claude AI is actually seeing

SELECT
  id,
  title,
  LEFT(description, 200) as description_preview,
  LENGTH(description) as description_length,
  LENGTH(title) as title_length,
  event_category,
  source_name,
  analyzed_at IS NULL as is_unanalyzed
FROM external_events
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
)
ORDER BY created_at DESC
LIMIT 5;

-- Also show the strategic risks for reference
SELECT
  'STRATEGIC RISKS:' as section,
  risk_code,
  risk_title
FROM risks
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
)
AND risk_code LIKE 'STR-%'
ORDER BY risk_code;
