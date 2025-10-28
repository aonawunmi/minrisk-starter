-- Manually test one cybersecurity event against strategic risks
-- This will help us understand why Claude AI isn't matching

-- Get one cybersecurity event
SELECT
  'EVENT TO TEST:' as section,
  id,
  title,
  LEFT(description, 200) as description_preview,
  event_category,
  source_name
FROM external_events
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
)
AND title ILIKE '%ransomware%' OR title ILIKE '%phishing%' OR title ILIKE '%cyber%'
LIMIT 1;

-- Get strategic cybersecurity risks
SELECT
  'STRATEGIC RISKS TO MATCH:' as section,
  risk_code,
  risk_title,
  LEFT(risk_description, 200) as description_preview
FROM risks
WHERE organization_id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@213.capital' LIMIT 1)
)
AND risk_code LIKE 'STR-CYB%'
ORDER BY risk_code;
