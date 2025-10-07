-- =====================================================
-- PHASE 3B: PERIOD MANAGEMENT FEATURE
-- Copy and paste this into Supabase SQL editor
-- =====================================================

-- 1. Add active_period field to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS active_period TEXT;

COMMENT ON COLUMN user_profiles.active_period IS 'Current working quarter for the user (e.g., Q1 2025, Q2 2025)';

-- 2. Create risk_history table
CREATE TABLE IF NOT EXISTS risk_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

    -- Period information
    period TEXT NOT NULL,
    committed_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Risk data (snapshot at commit time)
    risk_code TEXT NOT NULL,
    risk_title TEXT NOT NULL,
    risk_description TEXT,
    division TEXT NOT NULL,
    department TEXT NOT NULL,
    category TEXT NOT NULL,
    owner TEXT NOT NULL,

    -- Inherent risk scores
    likelihood_inherent INTEGER NOT NULL,
    impact_inherent INTEGER NOT NULL,

    -- Status and priority
    status TEXT NOT NULL CHECK (status IN ('Open', 'In Progress', 'Closed')),
    is_priority BOOLEAN DEFAULT FALSE,

    -- Controls (stored as JSONB array)
    controls JSONB DEFAULT '[]'::jsonb,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: same user + same risk_code can exist multiple times but for different periods
    UNIQUE(organization_id, user_id, risk_code, period)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_risk_history_org ON risk_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_history_user ON risk_history(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_history_period ON risk_history(period);
CREATE INDEX IF NOT EXISTS idx_risk_history_user_period ON risk_history(user_id, period);

COMMENT ON TABLE risk_history IS 'Stores committed risk snapshots per user per period';

-- 3. Enable RLS on risk_history
ALTER TABLE risk_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own risk history
CREATE POLICY "Users can view their own risk history"
ON risk_history FOR SELECT
USING (user_id = auth.uid());

-- Policy: Admins can view all risk history in their organization
CREATE POLICY "Admins can view all organization risk history"
ON risk_history FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Policy: Users can insert their own risk history (via commit function)
CREATE POLICY "Users can commit their own risks"
ON risk_history FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own risk history (uncommit)
CREATE POLICY "Users can uncommit their own periods"
ON risk_history FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- 4. Function: Commit User Period
-- =====================================================
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

    -- Get user's organization
    SELECT organization_id INTO v_org_id
    FROM user_profiles
    WHERE id = v_user_id;

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
    AND relevant_period = target_period
    AND archived = FALSE;

    -- Copy risks to risk_history
    INSERT INTO risk_history (
        organization_id, user_id, period, risk_code, risk_title, risk_description,
        division, department, category, owner, likelihood_inherent, impact_inherent,
        status, is_priority, controls, committed_date
    )
    SELECT
        organization_id, user_id, relevant_period, risk_code, risk_title, risk_description,
        division, department, category, owner, likelihood_inherent, impact_inherent,
        status, FALSE, controls, NOW()
    FROM risks
    WHERE user_id = v_user_id
    AND relevant_period = target_period
    AND archived = FALSE;

    -- Delete the committed risks from active register
    DELETE FROM risks
    WHERE user_id = v_user_id
    AND relevant_period = target_period
    AND archived = FALSE;

    -- Log to audit trail
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

    RETURN jsonb_build_object('success', true, 'risk_count', v_risk_count);
END;
$$;

COMMENT ON FUNCTION commit_user_period IS 'Commits all user risks for a period to risk_history and clears the register';

-- =====================================================
-- 5. Function: Uncommit User Period (Delete committed period)
-- =====================================================
CREATE OR REPLACE FUNCTION uncommit_user_period(target_period TEXT)
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
        v_org_id, v_user_id, 'period_uncommitted', 'period', target_period,
        jsonb_build_object(
            'period', target_period,
            'deleted_count', v_deleted_count
        )
    );

    RETURN jsonb_build_object('success', true, 'deleted_count', v_deleted_count);
END;
$$;

COMMENT ON FUNCTION uncommit_user_period IS 'Deletes a committed period from risk_history (user can only delete their own)';

-- =====================================================
-- 6. Function: Change Active Period (bulk update all user's risks)
-- =====================================================
CREATE OR REPLACE FUNCTION change_active_period(new_period TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_updated_count INTEGER;
    v_old_period TEXT;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Get user's organization and current active period
    SELECT organization_id, active_period INTO v_org_id, v_old_period
    FROM user_profiles
    WHERE id = v_user_id;

    -- Update user's active_period
    UPDATE user_profiles
    SET active_period = new_period
    WHERE id = v_user_id;

    -- Update all user's active risks to new period
    UPDATE risks
    SET relevant_period = new_period
    WHERE user_id = v_user_id AND archived = FALSE;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    -- Log to audit trail
    INSERT INTO audit_trail (
        organization_id, user_id, action_type, entity_type, entity_id,
        metadata
    )
    VALUES (
        v_org_id, v_user_id, 'active_period_changed', 'user', v_user_id::text,
        jsonb_build_object(
            'old_period', v_old_period,
            'new_period', new_period,
            'risks_updated', v_updated_count
        )
    );

    RETURN jsonb_build_object('success', true, 'updated_count', v_updated_count);
END;
$$;

COMMENT ON FUNCTION change_active_period IS 'Changes user active period and updates all their active risks in bulk';

-- =====================================================
-- DONE! Now test the functions
-- =====================================================
