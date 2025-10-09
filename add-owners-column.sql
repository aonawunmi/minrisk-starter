-- =====================================================
-- Add 'owners' column to app_configs table
-- =====================================================

-- Add owners column (JSONB array)
ALTER TABLE app_configs
ADD COLUMN IF NOT EXISTS owners JSONB DEFAULT '["John Doe", "Jane Smith", "Mike Johnson", "Sarah Williams", "David Brown"]'::jsonb;

-- Verify the change
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'app_configs'
  AND column_name = 'owners';

-- =====================================================
-- DONE! Run this in Supabase SQL Editor
-- =====================================================
