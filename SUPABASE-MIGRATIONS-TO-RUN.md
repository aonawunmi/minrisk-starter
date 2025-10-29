# Supabase Migrations to Run

## Status Summary

### Completed
- ✅ Fixed events privacy bug (3 functions now filter by organization_id)
- ✅ Deployed event privacy fixes to Vercel (commit 68b3d1e)
- ✅ Bulk delete button added to UI

### Pending - Requires Database Updates
- ❌ Bulk delete functionality not working (RLS policy blocks DELETE)
- ❌ Manual treatment tracking columns not added yet

## Critical Issues

### Issue 1: Bulk Delete Button Not Working
**Symptom:** Button appears but clicking it doesn't delete pending alerts

**Root Cause:** Row Level Security (RLS) policy on `risk_intelligence_alerts` table is missing DELETE permission

**Fix:** Run migration #1 below

### Issue 2: Manual Treatment Workflow Not Fully Enabled
**Symptom:** Treatment tracking fields don't exist yet

**Root Cause:** Migration hasn't been run

**Fix:** Run migration #2 below

## Migrations to Run in Supabase SQL Editor

Go to: Supabase Dashboard → SQL Editor → New Query

### Migration 1: Fix DELETE Permission (CRITICAL - Run First)

```sql
-- Fix RLS DELETE permission for risk_intelligence_alerts table
-- This allows users to delete alerts from their own organization

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete alerts from their organization" ON risk_intelligence_alerts;

-- Create new delete policy
CREATE POLICY "Users can delete alerts from their organization"
  ON risk_intelligence_alerts
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Verify the policy was created
COMMENT ON POLICY "Users can delete alerts from their organization" ON risk_intelligence_alerts
IS 'Allows authenticated users to delete risk intelligence alerts belonging to their organization';
```

**Expected Result:** Policy created successfully

**Test:** After running, try clicking "Delete All Pending" button in Intelligence tab

---

### Migration 2: Add Treatment Tracking Columns

```sql
-- Add columns to track manual treatment of alerts
-- This enables the new treatment log workflow

ALTER TABLE risk_intelligence_alerts
ADD COLUMN IF NOT EXISTS applied_to_risk BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS applied_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS treatment_notes TEXT;

-- Add index for performance when querying unapplied accepted alerts
CREATE INDEX IF NOT EXISTS idx_alerts_treatment_pending
ON risk_intelligence_alerts (organization_id, status, applied_to_risk)
WHERE status = 'accepted' AND applied_to_risk = FALSE;

-- Add comment for documentation
COMMENT ON COLUMN risk_intelligence_alerts.applied_to_risk
IS 'Tracks whether accepted alert has been manually applied to risk register';
COMMENT ON COLUMN risk_intelligence_alerts.applied_at
IS 'Timestamp when alert was applied to risk register';
COMMENT ON COLUMN risk_intelligence_alerts.applied_by
IS 'User who applied the alert treatment';
COMMENT ON COLUMN risk_intelligence_alerts.treatment_notes
IS 'Notes documenting how the alert was treated';
```

**Expected Result:** 4 columns added, index created successfully

**Test:** Accept an alert, then manually apply it from the treatment log

---

## Verification Steps

### After Migration 1 (Delete Permission)
1. Go to Intelligence Monitor
2. Check pending alerts count (should see "Delete All Pending" button if count > 0)
3. Click "Delete All Pending"
4. Confirm deletion
5. Verify pending count drops to 0
6. Check that accepted/rejected alerts remain intact

### After Migration 2 (Treatment Tracking)
1. Review a pending alert
2. Click "Accept"
3. Alert should show in "Accepted" tab with "Pending Application" status
4. Add treatment notes
5. Click "Apply to Risk Register"
6. Verify alert marked as "Applied" with timestamp
7. Verify risk likelihood was updated

## Privacy Fixes Already Deployed

The following functions now correctly filter by organization_id:

**Alerts (Previously Fixed):**
- `loadRiskAlerts()` - src/lib/riskIntelligence.ts:264
- `getAlertsStatistics()` - src/lib/riskIntelligence.ts:494
- `updateAlertStatus()` - src/lib/riskIntelligence.ts:317
- `applyAlertTreatment()` - src/lib/riskIntelligence.ts:354

**Events (Just Fixed - Deployed):**
- `loadEvents()` - src/components/intelligence/EventBrowser.tsx:59
- `handleDelete()` - src/components/intelligence/EventBrowser.tsx:118
- `loadExternalEvents()` - src/lib/riskIntelligence.ts:190

These are now live on production and working correctly.

## Migration Files Location

All migration SQL files are in:
- `supabase/migrations/fix-alerts-delete-permission.sql`
- `supabase/migrations/add-alert-treatment-tracking.sql`

## After Running Migrations

Once both migrations are run, the Intelligence Monitor will be fully operational with:

1. ✅ Bulk delete for pending alerts
2. ✅ Manual treatment workflow for accepted alerts
3. ✅ Treatment notes and audit trail
4. ✅ Organization-level data isolation (privacy)
5. ✅ Risk descriptions in alert cards
6. ✅ Complete workflow from alert → acceptance → treatment → risk update

## Questions?

If you encounter any errors:
1. Copy the error message
2. Check which migration failed
3. Verify RLS is enabled on risk_intelligence_alerts table
4. Check that user_profiles table exists and has organization_id column

---

**Last Updated:** 2025-10-28
**Related Docs:** INTELLIGENCE-UPGRADES-COMPLETE.md, HELP-INTELLIGENCE-UPGRADES.md
