-- Check what configs exist
SELECT
  id,
  organization_id,
  user_id,
  divisions,
  departments,
  categories,
  owners,
  updated_at
FROM app_configs
ORDER BY organization_id, updated_at DESC;
