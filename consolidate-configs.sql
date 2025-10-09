-- =====================================================
-- Consolidate app_configs to one per organization
-- =====================================================

-- First, let's see what we have
SELECT * FROM app_configs ORDER BY organization_id, updated_at DESC;

-- Delete all configs except the most recent one per organization
DELETE FROM app_configs
WHERE id NOT IN (
  SELECT DISTINCT ON (organization_id) id
  FROM app_configs
  ORDER BY organization_id, updated_at DESC
);

-- Verify - should have only one config per organization
SELECT organization_id, COUNT(*) as config_count
FROM app_configs
GROUP BY organization_id;

-- =====================================================
-- DONE! Run this in Supabase SQL Editor
-- =====================================================
