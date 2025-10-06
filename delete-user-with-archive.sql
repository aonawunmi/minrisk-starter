-- Enhanced delete_user function with archiving and audit logging
-- Copy and paste this into Supabase SQL editor to replace the current function

DROP FUNCTION IF EXISTS delete_user(uuid);

CREATE OR REPLACE FUNCTION delete_user(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_is_admin boolean;
  v_org_id uuid;
  v_user_email text;
  v_risk record;
  v_control record;
  v_archived_risk_id uuid;
  v_total_risks integer := 0;
  v_total_controls integer := 0;
BEGIN
  -- Get current user
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if current user is admin
  SELECT organization_id, role = 'admin' INTO v_org_id, v_is_admin
  FROM user_profiles
  WHERE id = v_admin_id;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can delete users');
  END IF;

  -- Check if target user exists and get email
  SELECT up.organization_id, au.email INTO v_org_id, v_user_email
  FROM user_profiles up
  LEFT JOIN admin_users_view au ON au.id = up.id
  WHERE up.id = target_user_id;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Archive all user's risks before deleting
  FOR v_risk IN
    SELECT * FROM risks WHERE user_id = target_user_id
  LOOP
    -- Insert into archived_risks
    INSERT INTO archived_risks (
      original_risk_id, organization_id, user_id, risk_code, risk_title,
      risk_description, division, department, category, owner,
      likelihood_inherent, impact_inherent, status, is_priority,
      archived_by, archive_reason, archive_notes,
      created_at, updated_at
    )
    VALUES (
      v_risk.id, v_risk.organization_id, v_risk.user_id, v_risk.risk_code, v_risk.risk_title,
      v_risk.risk_description, v_risk.division, v_risk.department, v_risk.category, v_risk.owner,
      v_risk.likelihood_inherent, v_risk.impact_inherent, v_risk.status, v_risk.is_priority,
      v_admin_id, 'user_deleted', 'User ' || COALESCE(v_user_email, target_user_id::text) || ' was deleted by admin',
      v_risk.created_at, v_risk.updated_at
    )
    RETURNING id INTO v_archived_risk_id;

    v_total_risks := v_total_risks + 1;

    -- Archive all controls for this risk
    FOR v_control IN
      SELECT * FROM controls WHERE risk_id = v_risk.id
    LOOP
      INSERT INTO archived_controls (
        original_control_id, archived_risk_id, risk_code, description, target,
        design, implementation, monitoring, effectiveness_evaluation,
        created_at, updated_at
      )
      VALUES (
        v_control.id, v_archived_risk_id, v_risk.risk_code, v_control.description, v_control.target,
        v_control.design, v_control.implementation, v_control.monitoring, v_control.effectiveness_evaluation,
        v_control.created_at, v_control.updated_at
      );
      v_total_controls := v_total_controls + 1;
    END LOOP;
  END LOOP;

  -- Log to audit trail
  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    metadata
  )
  VALUES (
    v_org_id, v_admin_id, 'user_deleted', 'user', target_user_id::text, v_user_email,
    jsonb_build_object(
      'deleted_by', v_admin_id,
      'risks_archived', v_total_risks,
      'controls_archived', v_total_controls,
      'user_email', v_user_email
    )
  );

  -- Delete user's risks (cascade will delete controls)
  DELETE FROM risks WHERE user_id = target_user_id;

  -- Delete user profile
  DELETE FROM user_profiles WHERE id = target_user_id;

  -- Try to delete from auth.users (may fail, that's ok)
  BEGIN
    DELETE FROM auth.users WHERE id = target_user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'risks_archived', v_total_risks,
    'controls_archived', v_total_controls
  );
END;
$$;

COMMENT ON FUNCTION delete_user IS 'Deletes a user, archives all their risks and controls, and logs to audit trail (admin only)';
