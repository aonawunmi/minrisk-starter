-- Change user role function with audit logging
-- Copy and paste this into Supabase SQL editor

-- =====================================================
-- CHANGE USER ROLE FUNCTION (with audit logging)
-- =====================================================
DROP FUNCTION IF EXISTS change_user_role(uuid, text);

CREATE OR REPLACE FUNCTION change_user_role(target_user_id uuid, new_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_is_admin boolean;
  v_org_id uuid;
  v_user_email text;
  v_old_role text;
  v_user_status text;
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
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can change user roles');
  END IF;

  -- Validate role
  IF new_role NOT IN ('admin', 'edit', 'view_only') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Get user info
  SELECT email, role, status INTO v_user_email, v_old_role, v_user_status
  FROM admin_users_view
  WHERE id = target_user_id;

  -- Only allow role change for approved users
  IF v_user_status != 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only change role for approved users');
  END IF;

  -- Update user role
  UPDATE user_profiles
  SET role = new_role::text
  WHERE id = target_user_id
  AND organization_id = v_org_id;

  -- Log to audit trail
  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    metadata
  )
  VALUES (
    v_org_id, v_admin_id, 'user_role_changed', 'user', target_user_id::text, v_user_email,
    jsonb_build_object(
      'old_role', v_old_role,
      'new_role', new_role,
      'changed_by', v_admin_id,
      'changed_by_email', (SELECT email FROM admin_users_view WHERE id = v_admin_id)
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION change_user_role IS 'Changes the role of an approved user and logs to audit trail (admin only)';
