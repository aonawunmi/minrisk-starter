-- Run this in Supabase SQL Editor to check if incident counts are being updated

-- 1. Check incidents table - see what risk codes are linked
SELECT
    incident_code,
    title,
    linked_risk_codes,
    array_length(linked_risk_codes, 1) as num_linked_risks
FROM incidents
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check risks table - see if linked_incident_count is being updated
SELECT
    risk_code,
    risk_title,
    linked_incident_count,
    last_incident_date
FROM risks
WHERE linked_incident_count > 0 OR linked_incident_count IS NOT NULL
ORDER BY linked_incident_count DESC NULLS LAST
LIMIT 10;

-- 3. If no results above, check all risks to see their incident count values
SELECT
    risk_code,
    risk_title,
    linked_incident_count
FROM risks
ORDER BY risk_code
LIMIT 20;
