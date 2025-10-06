# Database Migration Instructions

## Step 1: Run the SQL Migration

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/cnywkjfkhnwptceluvzs/sql/new

2. Copy the entire contents of `supabase-migration-archive-audit.sql`

3. Paste into the SQL editor and click "Run"

4. Verify the migration succeeded by checking for these new tables:
   - `archived_risks`
   - `archived_controls`
   - `archived_config_values`
   - `audit_trail`
   - `pending_deletions`

## What This Migration Creates:

### Tables:
1. **archived_risks** - Stores risks that have been archived
2. **archived_controls** - Stores controls from archived risks
3. **archived_config_values** - Stores archived divisions/departments/categories
4. **audit_trail** - Complete log of all system actions
5. **pending_deletions** - Deletion requests awaiting admin approval

### Functions:
1. **archive_risk(risk_code, reason, notes)** - Archive a risk with all its controls
2. **count_risks_with_config_value(type, value)** - Count risks using a config value
3. **archive_config_value(type, value, reason)** - Archive a config value
4. **permanent_delete_archived_risk(archived_risk_id)** - Permanently delete from archive (admin only)
5. **request_deletion(risk_code, reason)** - User requests deletion (needs admin approval)
6. **approve_deletion(pending_deletion_id, notes, should_archive)** - Admin approves deletion
7. **reject_deletion(pending_deletion_id, notes)** - Admin rejects deletion

## Step 2: Test the Migration

Run these queries to verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('archived_risks', 'archived_controls', 'archived_config_values', 'audit_trail', 'pending_deletions');

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('archive_risk', 'count_risks_with_config_value', 'archive_config_value', 'permanent_delete_archived_risk', 'request_deletion', 'approve_deletion', 'reject_deletion');

-- Test count function
SELECT count_risks_with_config_value('division', 'IT');
```

## Next Steps:

After migration succeeds, we'll implement the frontend TypeScript code for:
1. Archive Management tab
2. Audit Trail tab
3. Config protection dialogs
4. User deletion with transfer option
5. Pending deletions approval interface
