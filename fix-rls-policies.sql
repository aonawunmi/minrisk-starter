-- Fix RLS policies to allow user profile creation
-- Run this in Supabase SQL Editor

-- Drop the restrictive policy on user_profiles INSERT
DROP POLICY IF EXISTS "allow_own_profile_insert" ON user_profiles;

-- Create a more permissive INSERT policy that allows authenticated users to create their own profile
CREATE POLICY "allow_own_profile_insert" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Also add a policy to allow users to insert their initial profile even without existing profile
-- This is needed for the bootstrap process
DROP POLICY IF EXISTS "allow_profile_bootstrap" ON user_profiles;
CREATE POLICY "allow_profile_bootstrap" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid())
  );

-- Make app_configs more permissive for initial config
DROP POLICY IF EXISTS "allow_own_config_select" ON app_configs;
CREATE POLICY "allow_own_config_select" ON app_configs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Verify policies are correct
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('user_profiles', 'app_configs', 'risks', 'controls')
ORDER BY tablename, policyname;
