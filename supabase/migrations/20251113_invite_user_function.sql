-- Migration: Add function to invite organization admin users
-- This function can be called from the Super Admin panel to create and invite users

-- Create function to invite a user and link them to an organization
CREATE OR REPLACE FUNCTION invite_organization_admin(
  p_email TEXT,
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Only super admins can invite users
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can invite organization admins';
  END IF;

  -- Validate email format
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Check if organization exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM organizations
    WHERE id = p_organization_id AND active = TRUE
  ) THEN
    RAISE EXCEPTION 'Organization not found or inactive';
  END IF;

  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NOT NULL THEN
    -- User exists, just link them to the organization
    UPDATE user_profiles
    SET organization_id = p_organization_id,
        role = 'admin'
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'User already exists and has been linked to the organization',
      'user_id', v_user_id,
      'action', 'linked'
    );
  ELSE
    -- Return success with instructions
    -- Note: Actual user creation must be done via Supabase Dashboard or Edge Function
    -- This is a limitation of PostgreSQL functions - they cannot call Supabase Auth API
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User invitation requires manual action. Please use Supabase Dashboard to invite: ' || p_email,
      'action', 'manual_invite_required',
      'email', p_email,
      'organization_id', p_organization_id
    );
  END IF;
END;
$$;

-- Grant execute permission to authenticated users (will be checked by RLS)
GRANT EXECUTE ON FUNCTION invite_organization_admin(TEXT, UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION invite_organization_admin IS 'Invite a user to be an organization admin. Super admins only.';
