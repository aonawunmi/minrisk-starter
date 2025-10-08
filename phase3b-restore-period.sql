-- =====================================================
-- ADD: Restore Period Function
-- Moves risks from history back to active register
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
    INSERT INTO risks (
        organization_id, user_id, risk_code, risk_title, risk_description,
        division, department, category, owner,
        likelihood_inherent, impact_inherent,
        likelihood_residual, impact_residual,
        relevant_period, status
    )
    SELECT
        organization_id, user_id, risk_code, risk_title, risk_description,
        division, department, category, owner,
        likelihood_inherent, impact_inherent,
        likelihood_residual, impact_residual,
        period, status
    FROM risk_history
    WHERE user_id = v_user_id AND period = target_period;

    GET DIAGNOSTICS v_restored_count = ROW_COUNT;

    -- Restore controls for each risk
    -- First, we need to insert controls from the JSONB array stored in history
    INSERT INTO controls (
        risk_id, description, target,
        design_rating, implementation_rating, monitoring_rating, effectiveness_evaluation
    )
    SELECT
        r.id,
        (ctrl->>'description')::text,
        (ctrl->>'target')::text,
        (ctrl->>'design_rating')::integer,
        (ctrl->>'implementation_rating')::integer,
        (ctrl->>'monitoring_rating')::integer,
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
-- Update uncommit function name for clarity
-- =====================================================

-- Rename the existing uncommit function to delete_user_period for clarity
CREATE OR REPLACE FUNCTION delete_user_period(target_period TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_deleted_count INTEGER;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Get user's organization
    SELECT organization_id INTO v_org_id
    FROM user_profiles
    WHERE id = v_user_id;

    -- Delete from risk_history
    DELETE FROM risk_history
    WHERE user_id = v_user_id AND period = target_period;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF v_deleted_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No committed risks found for this period');
    END IF;

    -- Log to audit trail
    INSERT INTO audit_trail (
        organization_id, user_id, action_type, entity_type, entity_id,
        metadata
    )
    VALUES (
        v_org_id, v_user_id, 'period_deleted', 'period', target_period,
        jsonb_build_object(
            'period', target_period,
            'deleted_count', v_deleted_count
        )
    );

    RETURN jsonb_build_object('success', true, 'deleted_count', v_deleted_count);
END;
$$;

COMMENT ON FUNCTION delete_user_period IS 'Permanently deletes a committed period from risk_history';

-- =====================================================
-- DONE! Run this in Supabase SQL Editor
-- Then reload schema cache: NOTIFY pgrst, 'reload schema';
-- =====================================================
