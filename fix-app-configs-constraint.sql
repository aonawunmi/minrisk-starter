-- =====================================================
-- Fix app_configs constraint to use only organization_id
-- =====================================================

-- Drop the old unique constraint (if exists)
ALTER TABLE app_configs
DROP CONSTRAINT IF EXISTS app_configs_organization_id_user_id_key;

-- Add new unique constraint on organization_id only
ALTER TABLE app_configs
ADD CONSTRAINT app_configs_organization_id_key UNIQUE (organization_id);

-- Verify the constraint
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'app_configs'
  AND constraint_type = 'UNIQUE';

-- =====================================================
-- DONE! Run this in Supabase SQL Editor
-- =====================================================
