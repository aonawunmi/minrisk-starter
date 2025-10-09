-- =====================================================
-- Fix restore_user_period function to handle duplicates
-- =====================================================

CREATE OR REPLACE FUNCTION restore_user_period(target_period TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    restored_count INT := 0;
    history_records RECORD;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Loop through history records for this period and user
    FOR history_records IN
        SELECT * FROM risk_history
        WHERE period = target_period
        AND user_id = current_user_id
    LOOP
        -- Check if risk already exists in active register
        IF EXISTS (
            SELECT 1 FROM risks
            WHERE risk_code = history_records.risk_code
            AND user_id = current_user_id
        ) THEN
            -- Update existing risk
            UPDATE risks SET
                risk_title = history_records.risk_title,
                risk_description = history_records.risk_description,
                division = history_records.division,
                department = history_records.department,
                category = history_records.category,
                owner = history_records.owner,
                relevant_period = history_records.period,
                likelihood_inherent = history_records.likelihood_inherent,
                impact_inherent = history_records.impact_inherent,
                status = history_records.status,
                updated_at = NOW()
            WHERE risk_code = history_records.risk_code
            AND user_id = current_user_id;
        ELSE
            -- Insert new risk
            INSERT INTO risks (
                user_id,
                organization_id,
                risk_code,
                risk_title,
                risk_description,
                division,
                department,
                category,
                owner,
                relevant_period,
                likelihood_inherent,
                impact_inherent,
                status,
                is_priority
            ) VALUES (
                history_records.user_id,
                history_records.organization_id,
                history_records.risk_code,
                history_records.risk_title,
                history_records.risk_description,
                history_records.division,
                history_records.department,
                history_records.category,
                history_records.owner,
                history_records.period,
                history_records.likelihood_inherent,
                history_records.impact_inherent,
                history_records.status,
                false
            );
        END IF;

        restored_count := restored_count + 1;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'restored_count', restored_count
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================
