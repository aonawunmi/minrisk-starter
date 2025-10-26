-- Fix for ambiguous column reference in sync_incident_count_to_risk trigger
-- Run this in Supabase SQL Editor to fix the 400 error when linking risks

CREATE OR REPLACE FUNCTION sync_incident_count_to_risk()
RETURNS TRIGGER AS $$
DECLARE
    v_risk_code TEXT;  -- Renamed variable to avoid ambiguity
BEGIN
    -- Handle INSERT and UPDATE
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Update count for all linked risks
        FOREACH v_risk_code IN ARRAY NEW.linked_risk_codes
        LOOP
            UPDATE risks
            SET
                linked_incident_count = (
                    SELECT COUNT(*)
                    FROM incidents
                    WHERE linked_risk_codes @> ARRAY[v_risk_code]::TEXT[]
                    AND organization_id = NEW.organization_id
                ),
                last_incident_date = (
                    SELECT MAX(incident_date)
                    FROM incidents
                    WHERE linked_risk_codes @> ARRAY[v_risk_code]::TEXT[]
                    AND organization_id = NEW.organization_id
                )
            WHERE risks.risk_code = v_risk_code  -- Qualified with table name
            AND risks.organization_id = NEW.organization_id;
        END LOOP;
    END IF;

    -- Handle DELETE
    IF (TG_OP = 'DELETE') THEN
        FOREACH v_risk_code IN ARRAY OLD.linked_risk_codes
        LOOP
            UPDATE risks
            SET
                linked_incident_count = (
                    SELECT COUNT(*)
                    FROM incidents
                    WHERE linked_risk_codes @> ARRAY[v_risk_code]::TEXT[]
                    AND organization_id = OLD.organization_id
                ),
                last_incident_date = (
                    SELECT MAX(incident_date)
                    FROM incidents
                    WHERE linked_risk_codes @> ARRAY[v_risk_code]::TEXT[]
                    AND organization_id = OLD.organization_id
                )
            WHERE risks.risk_code = v_risk_code  -- Qualified with table name
            AND risks.organization_id = OLD.organization_id;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
