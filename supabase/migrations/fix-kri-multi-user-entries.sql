-- =====================================================
-- FIX: User-Isolated KRI Data Model
-- Issue: Unique constraint (kri_id, measurement_date) prevents
--        multiple users from entering data for same KRI on same day
-- Solution: Implement user-level isolation - each user tracks
--          their own KRI measurements independently (like Risk Appetite)
-- Created: 2025-10-30
-- =====================================================

-- Step 1: Drop the existing unique constraint
ALTER TABLE kri_data_entries
  DROP CONSTRAINT IF EXISTS kri_data_entries_kri_id_measurement_date_key;

-- Step 2: Add user ID tracking column (NOT NULL for new entries)
ALTER TABLE kri_data_entries
  ADD COLUMN IF NOT EXISTS entered_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Backfill existing entries with current user if any exist
-- Existing entries will be assigned to the first admin user found, or deleted if no users
DO $$
DECLARE
  v_first_user_id UUID;
BEGIN
  -- Get first user to assign orphaned records
  SELECT id INTO v_first_user_id FROM auth.users LIMIT 1;

  IF v_first_user_id IS NOT NULL THEN
    UPDATE kri_data_entries
    SET entered_by_user_id = v_first_user_id
    WHERE entered_by_user_id IS NULL;
  ELSE
    -- No users found, delete orphaned entries
    DELETE FROM kri_data_entries WHERE entered_by_user_id IS NULL;
  END IF;
END $$;

-- Step 4: Make entered_by_user_id NOT NULL for data integrity
ALTER TABLE kri_data_entries
  ALTER COLUMN entered_by_user_id SET NOT NULL;

-- Step 5: Create unique constraint - one entry per user per KRI per day
CREATE UNIQUE INDEX kri_data_entries_user_kri_date_unique
  ON kri_data_entries(entered_by_user_id, kri_id, measurement_date);

-- Step 6: Create function to auto-set entered_by_user_id
CREATE OR REPLACE FUNCTION set_kri_entry_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically set the user ID from auth context
  IF NEW.entered_by_user_id IS NULL THEN
    NEW.entered_by_user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger to auto-populate user ID on insert
DROP TRIGGER IF EXISTS kri_data_entry_set_user_id ON kri_data_entries;
CREATE TRIGGER kri_data_entry_set_user_id
  BEFORE INSERT ON kri_data_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_kri_entry_user_id();

-- Step 8: Update RLS policies for user-level isolation
DROP POLICY IF EXISTS "Users can view KRI data in their organization" ON kri_data_entries;
DROP POLICY IF EXISTS "Users can insert KRI data entries" ON kri_data_entries;
DROP POLICY IF EXISTS "Users can update their own KRI data entries" ON kri_data_entries;
DROP POLICY IF EXISTS "Admins can delete KRI data entries" ON kri_data_entries;

-- Users can only view their own KRI data entries
CREATE POLICY "Users can view their own KRI data entries"
  ON kri_data_entries FOR SELECT
  USING (
    entered_by_user_id = auth.uid()
  );

-- Admins can view all KRI data in their organization
CREATE POLICY "Admins can view all org KRI data entries"
  ON kri_data_entries FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can insert their own KRI data
CREATE POLICY "Users can insert their own KRI data entries"
  ON kri_data_entries FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    AND (entered_by_user_id = auth.uid() OR entered_by_user_id IS NULL)
  );

-- Users can only update their own entries
CREATE POLICY "Users can update their own KRI data entries"
  ON kri_data_entries FOR UPDATE
  USING (
    entered_by_user_id = auth.uid()
  );

-- Users can delete their own entries
CREATE POLICY "Users can delete their own KRI data entries"
  ON kri_data_entries FOR DELETE
  USING (
    entered_by_user_id = auth.uid()
  );

-- Admins can delete any entries in their organization
CREATE POLICY "Admins can delete org KRI data entries"
  ON kri_data_entries FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 9: Update KRI Alerts policies for user isolation
DROP POLICY IF EXISTS "Users can view KRI alerts in their organization" ON kri_alerts;

-- Users can only view alerts for their own KRI data
CREATE POLICY "Users can view their own KRI alerts"
  ON kri_alerts FOR SELECT
  USING (
    data_entry_id IN (
      SELECT id FROM kri_data_entries WHERE entered_by_user_id = auth.uid()
    )
  );

-- Admins can view all alerts in their organization
CREATE POLICY "Admins can view all org KRI alerts"
  ON kri_alerts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 10: Add index for performance
CREATE INDEX IF NOT EXISTS idx_kri_data_entries_user
  ON kri_data_entries(entered_by_user_id);

CREATE INDEX IF NOT EXISTS idx_kri_data_entries_user_kri
  ON kri_data_entries(entered_by_user_id, kri_id);

-- =====================================================
-- MIGRATION COMPLETE
--
-- Changes:
-- ✅ Removed org-wide (kri_id, measurement_date) unique constraint
-- ✅ Added entered_by_user_id column (NOT NULL) with foreign key
-- ✅ New unique constraint: (entered_by_user_id, kri_id, measurement_date)
-- ✅ Auto-populate entered_by_user_id on insert
-- ✅ User-isolated RLS policies: users only see/edit their own data
-- ✅ Admin override: admins can view all org data
-- ✅ Alert isolation: users only see alerts for their own entries
--
-- Result:
-- ✅ Each user tracks their own KRI measurements independently
-- ✅ No conflicts - users can enter data for same KRI on same date
-- ✅ User can only have one entry per KRI per date (prevents duplicates)
-- ✅ Users cannot see other users' KRI data
-- ✅ Admins can view org-wide data for oversight
-- ✅ Similar to Risk Appetite user isolation model
-- =====================================================
