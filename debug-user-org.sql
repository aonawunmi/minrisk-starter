-- =====================================================
-- Debug: Check user profiles and their organizations
-- =====================================================

-- 1. Check all user profiles
SELECT
  id as user_id,
  organization_id,
  created_at
FROM user_profiles
ORDER BY created_at DESC;

-- 2. Check all app_configs
SELECT
  id,
  organization_id,
  user_id,
  divisions,
  updated_at
FROM app_configs
ORDER BY updated_at DESC;

-- 3. Check if user_profiles.organization_id matches app_configs.organization_id
SELECT
  up.id as user_id,
  up.organization_id as user_org_id,
  ac.organization_id as config_org_id,
  ac.divisions,
  CASE
    WHEN up.organization_id = ac.organization_id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as status
FROM user_profiles up
LEFT JOIN app_configs ac ON up.organization_id = ac.organization_id
ORDER BY up.created_at DESC;

-- =====================================================
-- Run this in Supabase SQL Editor to debug the issue
-- =====================================================
