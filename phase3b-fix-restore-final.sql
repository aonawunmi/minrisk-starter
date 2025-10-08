-- =====================================================
-- FIX: restore_user_period - don't insert residual columns
-- The risks table doesn't have residual columns, residual is calculated by frontend
-- =====================================================

CREATE OR REPLACE FUNCTION restore_user_period(target_period TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_restored_count INTEGER;
    v_history_count INTEGER;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Check if period exists in history
    SELECT COUNT(*) INTO v_history_count
    FROM risk_history
    WHERE user_id = v_user_id AND period = target_period;

    IF v_history_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No committed risks found for this period');
    END IF;

    -- Get organization_id from first history record
    SELECT organization_id INTO v_org_id
    FROM risk_history
    WHERE user_id = v_user_id AND period = target_period
    LIMIT 1;

    -- Copy risks from risk_history back to active risks table
    -- Only copy inherent values, residual is calculated by controls
    INSERT INTO risks (
        organization_id, user_id, risk_code, risk_title, risk_description,
        division, department, category, owner,
        likelihood_inherent, impact_inherent,
        relevant_period, status
    )
    SELECT
        organization_id, user_id, risk_code, risk_title, risk_description,
        division, department, category, owner,
        likelihood_inherent, impact_inherent,
        period, status
    FROM risk_history
    WHERE user_id = v_user_id AND period = target_period;

    GET DIAGNOSTICS v_restored_count = ROW_COUNT;

    -- Restore controls for each risk
    INSERT INTO controls (
        risk_id, description, target,
        design, implementation, monitoring, effectiveness_evaluation
    )
    SELECT
        r.id,
        (ctrl->>'description')::text,
        (ctrl->>'target')::text,
        (ctrl->>'design')::integer,
        (ctrl->>'implementation')::integer,
        (ctrl->>'monitoring')::integer,
        (ctrl->>'effectiveness_evaluation')::integer
    FROM risk_history rh
    CROSS JOIN jsonb_array_elements(rh.controls) AS ctrl
    JOIN risks r ON r.risk_code = rh.risk_code AND r.user_id = rh.user_id
    WHERE rh.user_id = v_user_id AND rh.period = target_period;

    -- Delete from risk_history after successful restore
    DELETE FROM risk_history
    WHERE user_id = v_user_id AND period = target_period;

    -- Log to audit trail
    IF v_org_id IS NOT NULL THEN
        INSERT INTO audit_trail (
            organization_id, user_id, action_type, entity_type, entity_id,
            metadata
        )
        VALUES (
            v_org_id, v_user_id, 'period_restored', 'period', target_period,
            jsonb_build_object(
                'period', target_period,
                'restored_count', v_restored_count,
                'restored_date', NOW()
            )
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'restored_count', v_restored_count);
END;
$$;

COMMENT ON FUNCTION restore_user_period IS 'Restores a committed period from history back to active register with all controls';

-- =====================================================
-- DONE! Run this in Supabase SQL Editor
-- =====================================================
