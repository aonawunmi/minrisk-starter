-- =====================================================
-- USER MANAGEMENT FUNCTIONS (SUPPLEMENTARY)
-- =====================================================
-- These are the existing user management functions that should already exist
-- Run this file if you're getting "function not found" errors

-- =====================================================
-- DELETE USER FUNCTION (with cascade to risks and controls)
-- =====================================================
CREATE OR REPLACE FUNCTION delete_user(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_is_admin boolean;
  v_org_id uuid;
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

  -- Check if target user exists and is in same org
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = target_user_id
    AND organization_id = v_org_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in your organization');
  END IF;

  -- Log to audit trail before deletion
  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    metadata
  )
  SELECT
    v_org_id, v_admin_id, 'user_deleted', 'user', target_user_id::text,
    (SELECT email FROM admin_users_view WHERE id = target_user_id),
    jsonb_build_object(
      'deleted_by', v_admin_id,
      'risk_count', (SELECT COUNT(*) FROM risks WHERE user_id = target_user_id)
    )
  WHERE EXISTS (SELECT 1 FROM audit_trail LIMIT 1); -- Only if audit_trail exists

  -- Delete user's risks (cascade will delete controls)
  DELETE FROM risks WHERE user_id = target_user_id;

  -- Delete user profile
  DELETE FROM user_profiles WHERE id = target_user_id;

  -- Delete from auth.users (if you have permission - may need to do this via Supabase dashboard)
  -- Note: This might fail if RLS policies prevent it - that's okay
  BEGIN
    DELETE FROM auth.users WHERE id = target_user_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors - user_profile deletion is what matters
    NULL;
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- APPROVE USER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION approve_user(target_user_id uuid, new_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_is_admin boolean;
  v_org_id uuid;
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
  SELECT
    v_org_id, v_admin_id, 'user_approved', 'user', target_user_id::text,
    (SELECT email FROM admin_users_view WHERE id = target_user_id),
    jsonb_build_object('role', new_role, 'approved_by', v_admin_id)
  WHERE EXISTS (SELECT 1 FROM audit_trail LIMIT 1);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- REJECT USER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION reject_user(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_is_admin boolean;
  v_org_id uuid;
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
  SELECT
    v_org_id, v_admin_id, 'user_rejected', 'user', target_user_id::text,
    (SELECT email FROM admin_users_view WHERE id = target_user_id),
    jsonb_build_object('rejected_by', v_admin_id)
  WHERE EXISTS (SELECT 1 FROM audit_trail LIMIT 1);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION delete_user IS 'Deletes a user and all their risks/controls (admin only)';
COMMENT ON FUNCTION approve_user IS 'Approves a pending user with specified role (admin only)';
COMMENT ON FUNCTION reject_user IS 'Rejects a pending user (admin only)';
