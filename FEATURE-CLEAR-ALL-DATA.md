# Feature Specification: CLEAR ALL Button

## Overview

Add a CLEAR ALL button to the Admin Dashboard that allows administrators to completely wipe intelligence data, incidence logs, and history for their organization.

## User Story

As an administrator, I want to be able to clear all intelligence data, incidence logs, and audit history with a single button, so I can reset the system for testing or start fresh.

## Location

**Component:** `src/components/AdminDashboard.tsx`
**Section:** Add to admin actions area (likely in a "Danger Zone" or "Data Management" section)

## Functionality

### Button Behavior
1. **Label:** "CLEAR ALL DATA"
2. **Style:** Destructive (red/danger variant)
3. **Icon:** Trash or warning icon
4. **Disabled when:** Already clearing data

### Confirmation Dialog
Before deletion, show a confirmation dialog with:
- **Title:** "⚠️ WARNING: Clear All Data"
- **Message:**
  ```
  This will permanently delete:
  • All intelligence alerts (pending, accepted, rejected)
  • All external events
  • All incidence logs
  • All audit/history records

  This action CANNOT be undone and only affects data for your organization.

  Are you absolutely sure you want to continue?
  ```
- **Input Field:** Type "DELETE" to confirm
- **Buttons:**
  - Cancel (gray)
  - Confirm Deletion (red, only enabled after typing "DELETE")

### Data to Clear

The following database tables should be cleared for the current organization:

1. **Intelligence Data:**
   - `risk_intelligence_alerts` - All alerts (pending/accepted/rejected)
   - `external_events` - All stored news/events

2. **Incidence Log:**
   - Table name TBD - need to identify in database
   - Likely: `incidents`, `incident_log`, or similar

3. **History/Audit Trail:**
   - Table name TBD - need to identify in database
   - Likely: `audit_log`, `risk_history`, `change_log`, or similar

4. **DO NOT DELETE:**
   - User profiles
   - Organization settings
   - Risk register (the actual risks - only delete their history/logs)
   - News sources configuration
   - Risk keywords

### Organization Filtering

**CRITICAL:** All deletions MUST filter by `organization_id` to ensure:
- Users only delete their organization's data
- Multi-tenant isolation is maintained
- Other organizations are unaffected

### Implementation Approach

#### Backend Function (src/lib/admin.ts - NEW FILE)

```typescript
export async function clearAllOrganizationData(): Promise<{
  success: boolean;
  deleted: {
    alerts: number;
    events: number;
    incidents: number;
    history: number;
  };
  error?: any;
}> {
  try {
    // Get current user's organization_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile) {
      return {
        success: false,
        deleted: { alerts: 0, events: 0, incidents: 0, history: 0 },
        error: 'User profile not found'
      };
    }

    const deleted = { alerts: 0, events: 0, incidents: 0, history: 0 };

    // 1. Delete intelligence alerts
    const { count: alertsCount } = await supabase
      .from('risk_intelligence_alerts')
      .delete({ count: 'exact' })
      .eq('organization_id', profile.organization_id);
    deleted.alerts = alertsCount || 0;

    // 2. Delete external events
    const { count: eventsCount } = await supabase
      .from('external_events')
      .delete({ count: 'exact' })
      .eq('organization_id', profile.organization_id);
    deleted.events = eventsCount || 0;

    // 3. Delete incidents (table name TBD)
    // TODO: Identify correct table name
    // const { count: incidentsCount } = await supabase
    //   .from('incidents')  // or 'incident_log'
    //   .delete({ count: 'exact' })
    //   .eq('organization_id', profile.organization_id);
    // deleted.incidents = incidentsCount || 0;

    // 4. Delete history/audit (table name TBD)
    // TODO: Identify correct table name
    // const { count: historyCount } = await supabase
    //   .from('audit_log')  // or 'risk_history', 'change_log'
    //   .delete({ count: 'exact' })
    //   .eq('organization_id', profile.organization_id);
    // deleted.history = historyCount || 0;

    return { success: true, deleted, error: null };
  } catch (error) {
    console.error('Error clearing organization data:', error);
    return {
      success: false,
      deleted: { alerts: 0, events: 0, incidents: 0, history: 0 },
      error
    };
  }
}
```

#### UI Component Updates (AdminDashboard.tsx)

Add state:
```typescript
const [clearingAll, setClearingAll] = useState(false);
const [clearMessage, setClearMessage] = useState('');
const [showClearDialog, setShowClearDialog] = useState(false);
const [confirmText, setConfirmText] = useState('');
```

Add handler:
```typescript
const handleClearAllData = async () => {
  if (confirmText !== 'DELETE') {
    return; // Button should be disabled anyway
  }

  setShowClearDialog(false);
  setClearingAll(true);
  setClearMessage('Clearing all data...');

  const { success, deleted, error } = await clearAllOrganizationData();

  if (success) {
    setClearMessage(
      `✅ Successfully cleared:
      - ${deleted.alerts} intelligence alerts
      - ${deleted.events} external events
      - ${deleted.incidents} incidents
      - ${deleted.history} history records`
    );
  } else {
    setClearMessage(`❌ Failed to clear data: ${error}`);
  }

  setTimeout(() => {
    setClearMessage('');
    setConfirmText('');
  }, 10000); // Show message for 10 seconds

  setClearingAll(false);
};
```

Add confirmation dialog and button to render:
```typescript
<Card>
  <CardHeader>
    <CardTitle className="text-red-600">⚠️ Danger Zone</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-gray-600 mb-4">
      Clear all intelligence data, incidence logs, and history for your organization.
      This action cannot be undone.
    </p>

    <Button
      variant="destructive"
      onClick={() => setShowClearDialog(true)}
      disabled={clearingAll}
    >
      {clearingAll ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Clearing...
        </>
      ) : (
        <>
          <Trash2 className="h-4 w-4 mr-2" />
          CLEAR ALL DATA
        </>
      )}
    </Button>

    {clearMessage && (
      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm whitespace-pre-line">
        {clearMessage}
      </div>
    )}
  </CardContent>
</Card>

{/* Confirmation Dialog */}
<Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>⚠️ WARNING: Clear All Data</DialogTitle>
      <DialogDescription className="space-y-3">
        <p>This will permanently delete:</p>
        <ul className="list-disc list-inside text-sm">
          <li>All intelligence alerts (pending, accepted, rejected)</li>
          <li>All external events</li>
          <li>All incidence logs</li>
          <li>All audit/history records</li>
        </ul>
        <p className="font-semibold text-red-600">
          This action CANNOT be undone and only affects data for your organization.
        </p>
        <p>Type <code className="bg-gray-100 px-1 rounded">DELETE</code> to confirm:</p>
      </DialogDescription>
    </DialogHeader>

    <Input
      value={confirmText}
      onChange={(e) => setConfirmText(e.target.value)}
      placeholder="Type DELETE to confirm"
      className="font-mono"
    />

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => {
          setShowClearDialog(false);
          setConfirmText('');
        }}
      >
        Cancel
      </Button>
      <Button
        variant="destructive"
        onClick={handleClearAllData}
        disabled={confirmText !== 'DELETE'}
      >
        Confirm Deletion
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### RLS Policies Required

Ensure DELETE policies exist for all tables:

```sql
-- Intelligence alerts (already should exist after fix-alerts-delete-permission.sql)
CREATE POLICY "Users can delete alerts from their organization"
  ON risk_intelligence_alerts FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- External events (create if missing)
CREATE POLICY "Users can delete events from their organization"
  ON external_events FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Incidents (table name TBD - create policy)
-- CREATE POLICY "Users can delete incidents from their organization"
--   ON incidents FOR DELETE
--   USING (organization_id IN (
--     SELECT organization_id FROM user_profiles WHERE id = auth.uid()
--   ));

-- History/Audit (table name TBD - create policy)
-- CREATE POLICY "Users can delete history from their organization"
--   ON audit_log FOR DELETE
--   USING (organization_id IN (
--     SELECT organization_id FROM user_profiles WHERE id = auth.uid()
--   ));
```

## TODO Before Implementation

1. **Identify Missing Tables:**
   - [ ] Find incidence log table name in Supabase
   - [ ] Find history/audit trail table name in Supabase
   - [ ] Confirm all tables have `organization_id` column

2. **Verify RLS Policies:**
   - [ ] Check DELETE policies exist for all tables
   - [ ] Test policies allow deletion with correct org filter

3. **Test in Development:**
   - [ ] Create test data across all tables
   - [ ] Test CLEAR ALL button
   - [ ] Verify only organization's data is deleted
   - [ ] Verify multi-tenant isolation works
   - [ ] Test confirmation dialog prevents accidental deletion

## Security Considerations

1. **Role-Based Access:**
   - Only admin users should see this button
   - Consider adding additional permission check

2. **Rate Limiting:**
   - Consider adding cooldown period (e.g., once per hour)
   - Log all CLEAR ALL actions for audit

3. **Backup Warning:**
   - Remind users to backup data before clearing
   - Consider adding "Export Data" feature before clear

## User Experience

**Success State:**
- Show count of items deleted
- Provide confirmation of successful deletion
- Auto-refresh any affected data views

**Error State:**
- Show specific error message
- Log error details for debugging
- Don't partially delete (use transactions if possible)

**Loading State:**
- Disable button during deletion
- Show spinner and progress message
- Prevent navigation away during deletion

## Related Files

- `src/components/AdminDashboard.tsx` - Add button and dialog
- `src/lib/admin.ts` - NEW: Create this file for admin functions
- `supabase/migrations/add-clear-all-rls-policies.sql` - NEW: RLS policies
- `SUPABASE-MIGRATIONS-TO-RUN.md` - Add new migration instructions

---

**Status:** TODO - Not yet implemented
**Priority:** Medium
**Complexity:** Medium (need to identify correct table names)
**Est. Time:** 2-3 hours
**Last Updated:** 2025-10-28
