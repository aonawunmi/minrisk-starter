-- Simple delete_user function
-- Copy and paste this into Supabase SQL editor

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

  RETURN jsonb_build_object('success', true);
END;
$$;
