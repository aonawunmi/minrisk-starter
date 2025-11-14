-- =====================================================
-- FIX APPROVE/REJECT USER FUNCTIONS
-- Updated to match new role hierarchy and support super admins
-- Date: 2025-11-14
-- =====================================================

-- Drop old functions
DROP FUNCTION IF EXISTS approve_user(uuid, text);
DROP FUNCTION IF EXISTS reject_user(uuid);

-- =====================================================
-- APPROVE USER FUNCTION (Fixed for new role system)
-- =====================================================
CREATE OR REPLACE FUNCTION approve_user(target_user_id uuid, new_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_is_super_admin boolean;
  v_is_primary_admin boolean;
  v_org_id uuid;
  v_user_email text;
  v_target_org_id uuid;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if current user is super admin
  SELECT EXISTS (
    SELECT 1 FROM is_super_admin_users WHERE user_id = v_admin_id
  ) INTO v_is_super_admin;

  -- Check if current user is primary admin
  IF NOT v_is_super_admin THEN
    SELECT organization_id, role = 'primary_admin' INTO v_org_id, v_is_primary_admin
    FROM user_profiles
    WHERE id = v_admin_id;

    IF NOT v_is_primary_admin THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only super admins and primary admins can approve users');
    END IF;
  END IF;

  -- Validate role (must match database constraint)
  IF new_role NOT IN ('primary_admin', 'secondary_admin', 'user') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role. Must be primary_admin, secondary_admin, or user');
  END IF;

  -- Get target user's organization
  SELECT organization_id INTO v_target_org_id
  FROM user_profiles
  WHERE id = target_user_id;

  -- If not super admin, ensure target user is in same organization
  IF NOT v_is_super_admin THEN
    IF v_target_org_id != v_org_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'Can only approve users in your organization');
    END IF;
  END IF;

  -- Get user email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = target_user_id;

  -- Update user profile
  UPDATE user_profiles
  SET
    status = 'approved',
    role = new_role::text,
    approved_at = now()
  WHERE id = target_user_id;

  -- Log to audit trail
  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    metadata
  )
  VALUES (
    v_target_org_id,
    v_admin_id,
    'user_approved',
    'user',
    target_user_id::text,
    v_user_email,
    jsonb_build_object(
      'role', new_role,
      'approved_by', v_admin_id,
      'approved_by_email', (SELECT email FROM auth.users WHERE id = v_admin_id),
      'is_super_admin_approval', v_is_super_admin
    )
  );

  RETURN jsonb_build_object('success', true, 'message', 'User approved successfully');
END;
$$;

-- =====================================================
-- REJECT USER FUNCTION (Fixed for new role system)
-- =====================================================
CREATE OR REPLACE FUNCTION reject_user(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_is_super_admin boolean;
  v_is_primary_admin boolean;
  v_org_id uuid;
  v_user_email text;
  v_target_org_id uuid;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if current user is super admin
  SELECT EXISTS (
    SELECT 1 FROM is_super_admin_users WHERE user_id = v_admin_id
  ) INTO v_is_super_admin;

  -- Check if current user is primary admin
  IF NOT v_is_super_admin THEN
    SELECT organization_id, role = 'primary_admin' INTO v_org_id, v_is_primary_admin
    FROM user_profiles
    WHERE id = v_admin_id;

    IF NOT v_is_primary_admin THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only super admins and primary admins can reject users');
    END IF;
  END IF;

  -- Get target user's organization
  SELECT organization_id INTO v_target_org_id
  FROM user_profiles
  WHERE id = target_user_id;

  -- If not super admin, ensure target user is in same organization
  IF NOT v_is_super_admin THEN
    IF v_target_org_id != v_org_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'Can only reject users in your organization');
    END IF;
  END IF;

  -- Get user email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = target_user_id;

  -- Update user profile
  UPDATE user_profiles
  SET status = 'rejected'
  WHERE id = target_user_id;

  -- Log to audit trail
  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    metadata
  )
  VALUES (
    v_target_org_id,
    v_admin_id,
    'user_rejected',
    'user',
    target_user_id::text,
    v_user_email,
    jsonb_build_object(
      'rejected_by', v_admin_id,
      'rejected_by_email', (SELECT email FROM auth.users WHERE id = v_admin_id),
      'is_super_admin_rejection', v_is_super_admin
    )
  );

  RETURN jsonb_build_object('success', true, 'message', 'User rejected successfully');
END;
$$;

-- Add comments
COMMENT ON FUNCTION approve_user IS 'Approves a pending user with specified role (primary_admin, secondary_admin, or user). Can be called by super admins or primary admins.';
COMMENT ON FUNCTION reject_user IS 'Rejects a pending user. Can be called by super admins or primary admins.';
