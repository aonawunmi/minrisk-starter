-- =====================================================
-- FIX: Add residual fields to risk_history table
-- =====================================================

-- 1. Add likelihood_residual and impact_residual columns
ALTER TABLE risk_history
ADD COLUMN IF NOT EXISTS likelihood_residual NUMERIC,
ADD COLUMN IF NOT EXISTS impact_residual NUMERIC;

COMMENT ON COLUMN risk_history.likelihood_residual IS 'Residual likelihood at commit time (after controls)';
COMMENT ON COLUMN risk_history.impact_residual IS 'Residual impact at commit time (after controls)';

-- 2. Update the commit_user_period function to store controls and residual values
CREATE OR REPLACE FUNCTION commit_user_period(target_period TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_risk_count INTEGER;
    v_committed_count INTEGER;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Check if period already committed
    SELECT COUNT(*) INTO v_committed_count
    FROM risk_history
    WHERE user_id = v_user_id AND period = target_period;

    IF v_committed_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Period already committed. Uncommit first to recommit.');
    END IF;

    -- Count risks for this period
    SELECT COUNT(*) INTO v_risk_count
    FROM risks
    WHERE user_id = v_user_id
    AND relevant_period = target_period;

    IF v_risk_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No risks found for this period');
    END IF;

    -- Get organization_id from the first risk
    SELECT organization_id INTO v_org_id
    FROM risks
    WHERE user_id = v_user_id
    AND relevant_period = target_period
    LIMIT 1;

    -- Copy risks to risk_history WITH controls and residual values
    INSERT INTO risk_history (
        organization_id, user_id, period, risk_code, risk_title, risk_description,
        division, department, category, owner,
        likelihood_inherent, impact_inherent,
        likelihood_residual, impact_residual,
        status, is_priority, controls, committed_date
    )
    SELECT
        r.organization_id, r.user_id, r.relevant_period, r.risk_code, r.risk_title, r.risk_description,
        r.division, r.department, r.category, r.owner,
        r.likelihood_inherent, r.impact_inherent,
        r.likelihood_residual, r.impact_residual,
        r.status, FALSE,
        -- Get controls as JSONB array
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'id', c.id,
                    'description', c.description,
                    'target', c.target,
                    'design_rating', c.design_rating,
                    'implementation_rating', c.implementation_rating,
                    'monitoring_rating', c.monitoring_rating,
                    'effectiveness_evaluation', c.effectiveness_evaluation
                )
            )
            FROM controls c
            WHERE c.risk_id = r.id),
            '[]'::jsonb
        ),
        NOW()
    FROM risks r
    WHERE r.user_id = v_user_id
    AND r.relevant_period = target_period;

    -- Delete the committed risks from active register
    DELETE FROM risks
    WHERE user_id = v_user_id
    AND relevant_period = target_period;

    -- Log to audit trail
    IF v_org_id IS NOT NULL THEN
        INSERT INTO audit_trail (
            organization_id, user_id, action_type, entity_type, entity_id,
            metadata
        )
        VALUES (
            v_org_id, v_user_id, 'period_committed', 'period', target_period,
            jsonb_build_object(
                'period', target_period,
                'risk_count', v_risk_count,
                'committed_date', NOW()
            )
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'risk_count', v_risk_count);
END;
$$;

COMMENT ON FUNCTION commit_user_period IS 'Commits all user risks for a period to risk_history with controls and residual values';

-- =====================================================
-- DONE! Run this in Supabase SQL Editor
-- =====================================================
