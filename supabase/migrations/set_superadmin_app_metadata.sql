-- Set Super Admin using app_metadata (proper way)
-- app_metadata is for admin-level flags and is properly synced by Supabase Auth

-- Update the user's app_metadata to include is_super_admin flag
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{is_super_admin}',
  'true'::jsonb
)
WHERE email = 'ayodele.onawunmi@gmail.com';

-- Verify the update
SELECT
  id,
  email,
  raw_user_meta_data->'is_super_admin' as user_metadata_flag,
  raw_app_meta_data->'is_super_admin' as app_metadata_flag
FROM auth.users
WHERE email = 'ayodele.onawunmi@gmail.com';
