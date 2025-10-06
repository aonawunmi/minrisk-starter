-- Enhanced approve_user and reject_user functions with audit logging
-- Copy and paste this into Supabase SQL editor

-- =====================================================
-- APPROVE USER FUNCTION (with audit logging)
-- =====================================================
DROP FUNCTION IF EXISTS approve_user(uuid, text);

CREATE OR REPLACE FUNCTION approve_user(target_user_id uuid, new_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_is_admin boolean;
  v_org_id uuid;
  v_user_email text;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if current user is admin
  SELECT organization_id, role = 'admin' INTO v_org_id, v_is_admin
  FROM user_profiles
  WHERE id = v_admin_id;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can approve users');
  END IF;

  -- Validate role
  IF new_role NOT IN ('admin', 'edit', 'view_only') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Get user email
  SELECT email INTO v_user_email
  FROM admin_users_view
  WHERE id = target_user_id;

  -- Update user profile
  UPDATE user_profiles
  SET
    status = 'approved',
    role = new_role::text,
    approved_at = now()
  WHERE id = target_user_id
  AND organization_id = v_org_id;

  -- Log to audit trail
  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    metadata
  )
  VALUES (
    v_org_id, v_admin_id, 'user_approved', 'user', target_user_id::text, v_user_email,
    jsonb_build_object(
      'role', new_role,
      'approved_by', v_admin_id,
      'approved_by_email', (SELECT email FROM admin_users_view WHERE id = v_admin_id)
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- REJECT USER FUNCTION (with audit logging)
-- =====================================================
DROP FUNCTION IF EXISTS reject_user(uuid);

CREATE OR REPLACE FUNCTION reject_user(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_is_admin boolean;
  v_org_id uuid;
  v_user_email text;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if current user is admin
  SELECT organization_id, role = 'admin' INTO v_org_id, v_is_admin
  FROM user_profiles
  WHERE id = v_admin_id;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can reject users');
  END IF;

  -- Get user email
  SELECT email INTO v_user_email
  FROM admin_users_view
  WHERE id = target_user_id;

  -- Update user profile
  UPDATE user_profiles
  SET status = 'rejected'
  WHERE id = target_user_id
  AND organization_id = v_org_id;

  -- Log to audit trail
  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    metadata
  )
  VALUES (
    v_org_id, v_admin_id, 'user_rejected', 'user', target_user_id::text, v_user_email,
    jsonb_build_object(
      'rejected_by', v_admin_id,
      'rejected_by_email', (SELECT email FROM admin_users_view WHERE id = v_admin_id)
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION approve_user IS 'Approves a pending user with specified role and logs to audit trail (admin only)';
COMMENT ON FUNCTION reject_user IS 'Rejects a pending user and logs to audit trail (admin only)';
