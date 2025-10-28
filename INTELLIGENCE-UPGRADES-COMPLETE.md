# Intelligence System Upgrades - Implementation Guide

## Overview

Three major upgrades have been implemented for the Risk Intelligence Monitor:

1. **Bulk Delete for Pending Alerts** - Delete all pending alerts at once
2. **Manual Alert Treatment Workflow** - Accepted alerts go to a treatment log for manual application
3. **Risk Descriptions in Alerts** - Show full risk details including descriptions

## Completed Changes

### 1. Database Migration ✅

**File:** `supabase/migrations/add-alert-treatment-tracking.sql`

Added columns to `risk_intelligence_alerts`:
- `applied_to_risk` - Boolean to track if alert has been applied
- `applied_at` - Timestamp when applied
- `applied_by` - User who applied it
- `treatment_notes` - Optional notes on treatment

**To Apply:**
Run this SQL in Supabase SQL Editor:
```sql
-- Copy contents of add-alert-treatment-tracking.sql and run
```

### 2. TypeScript Types Updated ✅

**File:** `src/lib/riskIntelligence.ts`

Updated `RiskIntelligenceAlert` type to include:
- `risk_title?: string`
- `risk_description?: string`
- `applied_to_risk?: boolean`
- `applied_at?: string`
- `applied_by?: string`
- `treatment_notes?: string`

### 3. Core Functions Updated ✅

**File:** `src/lib/riskIntelligence.ts`

**Changes:**
- ✅ `updateAlertStatus()` - Removed automatic risk likelihood update
- ✅ `applyAlertTreatment()` - NEW function to manually apply accepted alerts
- ✅ `bulkDeletePendingAlerts()` - NEW function to delete all pending alerts

### 4. UI Components Updated ✅

**AlertReviewDialog** (`src/components/intelligence/AlertReviewDialog.tsx`):
- ✅ Removed "Apply to Risk" checkbox
- ✅ Changed messaging to explain manual treatment workflow
- ✅ Added display of risk title and description (needs one more edit - see below)

**IntelligenceAlertCard** (`src/components/intelligence/IntelligenceAlertCard.tsx`):
- ✅ Added display of `risk_title` and `risk_description`
- ✅ Shows below risk code in a compact format

## Remaining To-Do

### Add Bulk Delete Button to Dashboard

**File to Edit:** `src/components/intelligence/IntelligenceDashboard.tsx`

**Location:** Around line 333-417 (in the header CardHeader section)

**Add these imports at top:**
```typescript
import { bulkDeletePendingAlerts } from '../../lib/riskIntelligence';
import { Trash2 } from 'lucide-react';
```

**Add state for bulk delete:**
```typescript
const [bulkDeleting, setBulkDeleting] = useState(false);
const [bulkDeleteMessage, setBulkDeleteMessage] = useState('');
```

**Add handler function:**
```typescript
const handleBulkDeletePending = async () => {
  if (!confirm(
    'This will delete ALL pending alerts. This action cannot be undone. Continue?'
  )) return;

  setBulkDeleting(true);
  setBulkDeleteMessage('Deleting pending alerts...');

  const { success, count, error } = await bulkDeletePendingAlerts();

  if (success) {
    setBulkDeleteMessage(`✅ Deleted ${count} pending alerts`);
    setTimeout(() => {
      setBulkDeleteMessage('');
      loadData();
      loadStats();
    }, 2000);
  } else {
    setBulkDeleteMessage(`❌ Failed to delete alerts: ${error}`);
    setTimeout(() => setBulkDeleteMessage(''), 5000);
  }

  setBulkDeleting(false);
};
```

**Add button in the header** (after the "Refresh" button):
```typescript
{statistics.pending > 0 && (
  <Button
    variant="destructive"
    size="sm"
    onClick={handleBulkDeletePending}
    disabled={bulkDeleting}
    title="Delete all pending alerts"
  >
    {bulkDeleting ? (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Deleting...
      </>
    ) : (
      <>
        <Trash2 className="h-4 w-4 mr-2" />
        Delete All Pending
      </>
    )}
  </Button>
)}
```

**Add message display** (in CardContent after other messages around line 469):
```typescript
{bulkDeleteMessage && (
  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
    {bulkDeleteMessage}
  </div>
)}
```

###  Fix Alert Review Dialog Risk Display

**File:** `src/components/intelligence/AlertReviewDialog.tsx`

**Find** (around line 117-124):
```typescript
<CardHeader>
  <div className="flex items-start justify-between">
    <div>
      <CardTitle className="text-lg flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        {alert.risk_code}
      </CardTitle>
    </div>
```

**Replace with:**
```typescript
<CardHeader>
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <CardTitle className="text-lg flex items-center gap-2 mb-1">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        {alert.risk_code}
      </CardTitle>
      {alert.risk_title && (
        <p className="text-sm font-medium text-gray-700">{alert.risk_title}</p>
      )}
      {alert.risk_description && (
        <p className="text-xs text-gray-600 mt-1">{alert.risk_description}</p>
      )}
    </div>
```

### Create Treatment Log Component (OPTIONAL BUT RECOMMENDED)

Create a new component to show accepted alerts that haven't been applied yet.

**New File:** `src/components/intelligence/AlertTreatmentLog.tsx`

```typescript
// Alert Treatment Log - Shows accepted alerts pending manual application

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Check, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { apply

AlertTreatment, type RiskAlertWithEvent } from '../../lib/riskIntelligence';

export function AlertTreatmentLog() {
  const [alerts, setAlerts] = useState<RiskAlertWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [treatmentNotes, setTreatmentNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUnappliedAlerts();
  }, []);

  const loadUnappliedAlerts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('risk_intelligence_alerts')
      .select(`
        *,
        event:external_events(*)
      `)
      .eq('status', 'accepted')
      .eq('applied_to_risk', false)
      .order('created_at', { ascending: false });

    if (data) {
      const transformed = data.map(alert => ({
        ...alert,
        event: Array.isArray(alert.event) ? alert.event[0] : alert.event,
      })) as RiskAlertWithEvent[];
      setAlerts(transformed);
    }
    setLoading(false);
  };

  const handleApply = async (alertId: string) => {
    setApplying(alertId);
    const notes = treatmentNotes[alertId] || '';

    const { success, error } = await applyAlertTreatment(alertId, notes);

    if (success) {
      await loadUnappliedAlerts();
    } else {
      window.alert(`Failed to apply treatment: ${error}`);
    }

    setApplying(null);
  };

  if (loading) {
    return <div>Loading treatment log...</div>;
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No accepted alerts pending application
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Treatment Log ({alerts.length} pending)</h3>
      {alerts.map(alert => (
        <Card key={alert.id} className="border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm">{alert.risk_code}</CardTitle>
                <p className="text-xs text-gray-600 mt-1">{alert.event.title}</p>
              </div>
              <div className="flex items-center gap-2">
                {alert.suggested_likelihood_change > 0 ? (
                  <Badge className="bg-red-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +{alert.suggested_likelihood_change}
                  </Badge>
                ) : alert.suggested_likelihood_change < 0 ? (
                  <Badge className="bg-green-600">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {alert.suggested_likelihood_change}
                  </Badge>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700">{alert.reasoning}</p>

            <div>
              <label className="text-xs font-medium text-gray-600">Treatment Notes (optional):</label>
              <Textarea
                value={treatmentNotes[alert.id] || ''}
                onChange={e => setTreatmentNotes(prev => ({ ...prev, [alert.id]: e.target.value }))}
                placeholder="Add notes on how you're treating this alert..."
                className="mt-1"
                rows={2}
              />
            </div>

            <Button
              onClick={() => handleApply(alert.id)}
              disabled={applying === alert.id}
              size="sm"
            >
              {applying === alert.id ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-2" />
                  Apply to Risk Register
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Then add to IntelligenceDashboard:**
1. Import: `import { AlertTreatmentLog } from './AlertTreatmentLog';`
2. Add state: `const [showTreatmentLog, setShowTreatmentLog] = useState(false);`
3. Add button in header to toggle treatment log
4. Conditionally render `{showTreatmentLog && <AlertTreatmentLog />}`

## Updated Workflow

### Old Workflow (Automatic):
1. Alert created → User accepts → Risk likelihood automatically updated

### New Workflow (Manual):
1. Alert created → User accepts → **Goes to treatment log**
2. User reviews treatment log → **Manually applies** to risk register
3. User can add notes on how it was treated
4. Alert marked as "applied" with timestamp and notes

## Benefits

1. **More Control** - User decides when to update risks
2. **Better Documentation** - Treatment notes track how alerts were handled
3. **Review Process** - Can batch review/apply alerts
4. **Auditability** - Clear history of who applied what and when
5. **Flexibility** - Can accept for reference without immediately changing risk scores

## Testing Checklist

- [ ] Run database migration in Supabase
- [ ] Verify new columns exist in `risk_intelligence_alerts` table
- [ ] Test accepting an alert (should NOT auto-update risk)
- [ ] Test bulk delete pending alerts
- [ ] Verify risk descriptions show in alert cards
- [ ] Verify risk descriptions show in review dialog
- [ ] Test applying treatment from treatment log
- [ ] Verify applied alerts are marked correctly
- [ ] Check audit trail (applied_at, applied_by fields)

## Help Document Updates

See separate `INTELLIGENCE-HELP-UPDATES.md` for the help document additions.

---

## Summary

**Core Functionality:** ✅ COMPLETE
- Database schema updated
- TypeScript types updated
- Core functions implemented
- Main UI components updated

**Remaining:** 🔨 MINOR EDITS NEEDED
- Add bulk delete button to dashboard (5 min)
- Fix risk display in dialog (2 min)
- (Optional) Create treatment log component (30 min)

**Next Steps:**
1. Apply database migration
2. Make the two small UI edits above
3. Test the new workflow
4. Update help document
5. Deploy to production
