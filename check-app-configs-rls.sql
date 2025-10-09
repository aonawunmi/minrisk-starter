-- =====================================================
-- Check RLS policies on app_configs table
-- =====================================================

-- Check existing policies on app_configs
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'app_configs';

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'app_configs';

-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================
