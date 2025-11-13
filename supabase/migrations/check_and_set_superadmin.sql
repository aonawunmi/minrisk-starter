-- Check which user is ayodele.onawunmi@gmail.com and set super admin flag

-- First, let's see all users with their metadata
SELECT id, email, raw_user_meta_data FROM auth.users;

-- Set super admin flag for ayodele.onawunmi@gmail.com
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{is_super_admin}',
  'true'::jsonb
)
WHERE email = 'ayodele.onawunmi@gmail.com';

-- Verify the update
SELECT id, email, raw_user_meta_data->'is_super_admin' as is_super_admin
FROM auth.users
WHERE email = 'ayodele.onawunmi@gmail.com';
