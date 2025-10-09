-- =====================================================
-- Fix RLS policies for app_configs table
-- Users should be able to read their organization's config
-- =====================================================

-- Check existing policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'app_configs';

-- Drop all existing policies on app_configs
DROP POLICY IF EXISTS "Users can read own config" ON app_configs;
DROP POLICY IF EXISTS "Users can update own config" ON app_configs;
DROP POLICY IF EXISTS "Users can insert own config" ON app_configs;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON app_configs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON app_configs;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON app_configs;
DROP POLICY IF EXISTS "Users can read org config" ON app_configs;
DROP POLICY IF EXISTS "Users can manage org config" ON app_configs;

-- Enable RLS
ALTER TABLE app_configs ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can read their organization's config
-- This joins with user_profiles to match organization_id
CREATE POLICY "Users can read org config"
ON app_configs
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_profiles
    WHERE id = auth.uid()
  )
);

-- Create policy: Users can insert/update their organization's config
CREATE POLICY "Users can manage org config"
ON app_configs
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_profiles
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM user_profiles
    WHERE id = auth.uid()
  )
);

-- Verify the new policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'app_configs';

-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================
