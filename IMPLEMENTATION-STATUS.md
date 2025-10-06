# MinRisk Archive & Protection Implementation Status

## ✅ COMPLETED FEATURES

### 1. Database Schema (DONE)
- ✅ **archived_risks** table - Stores archived risks with metadata
- ✅ **archived_controls** table - Stores controls from archived risks
- ✅ **archived_config_values** table - Stores archived config values
- ✅ **audit_trail** table - Complete system action log
- ✅ **pending_deletions** table - Deletion approval workflow

### 2. SQL Functions (DONE)
- ✅ `archive_risk()` - Archives risk with controls
- ✅ `count_risks_with_config_value()` - Counts usage of config values
- ✅ `archive_config_value()` - Archives removed config values
- ✅ `permanent_delete_archived_risk()` - Permanent deletion (admin only)
- ✅ `request_deletion()` - User requests deletion
- ✅ `approve_deletion()` - Admin approves deletion request
- ✅ `reject_deletion()` - Admin rejects deletion request

### 3. TypeScript Helper Functions (DONE)
**File: `src/lib/archive.ts`**
- ✅ `archiveRisk()` - Archive a risk
- ✅ `loadArchivedRisks()` - Load all archived risks
- ✅ `loadArchivedControls()` - Load controls for archived risk
- ✅ `permanentDeleteArchivedRisk()` - Permanent delete with password
- ✅ `countRisksWithConfigValue()` - Count config value usage
- ✅ `archiveConfigValue()` - Archive config value
- ✅ `loadAuditTrail()` - Load audit entries
- ✅ `logAuditEntry()` - Log new audit entry
- ✅ `requestDeletion()` - Request deletion (user)
- ✅ `loadPendingDeletions()` - Load pending deletions
- ✅ `approveDeletion()` - Approve deletion (admin)
- ✅ `rejectDeletion()` - Reject deletion (admin)

### 4. Archive Management UI (DONE)
**File: `src/components/ArchiveManagement.tsx`**
- ✅ View all archived risks in table
- ✅ Statistics cards (total, by reason)
- ✅ View details dialog (risk + controls)
- ✅ Password-protected permanent deletion
- ✅ Archive reason display
- ✅ Refresh functionality

### 5. Audit Trail UI (DONE)
**File: `src/components/AuditTrail.tsx`**
- ✅ View all audit entries in table
- ✅ Filter by action type, entity type, search query
- ✅ Adjustable load limit (50/100/200/500)
- ✅ Statistics cards
- ✅ View details dialog with JSON display
- ✅ Color-coded action types
- ✅ User email display

### 6. Admin Dashboard Integration (DONE)
**File: `src/components/AdminDashboard.tsx`**
- ✅ Added tabs: Users, Archive, Audit Trail
- ✅ Archive Management tab integrated
- ✅ Audit Trail tab integrated

---

## 🔄 IN PROGRESS / TO BE IMPLEMENTED

### 7. Configuration Protection ⏳
**Location: `src/App.tsx` around line 1200**

#### What Needs To Be Done:
1. **Before deleting a config value (division/department/category)**:
   - Call `countRisksWithConfigValue()` to check usage
   - If usage > 0, show warning dialog with count
   - Give admin two options:
     - **Archive & Remove**: Archive all affected risks, then remove config value
     - **Cancel**: Don't remove
   - Call `archiveConfigValue()` when removing

2. **Implementation Steps**:
   - Add state for deletion dialog
   - Modify `handleListChange()` function to detect removals
   - Before applying removal, check count
   - Show dialog if count > 0
   - If admin confirms, archive affected risks first, then remove config value

**Code Location to Modify**:
```typescript
// Around line 1170-1200 in App.tsx
// Look for ConfigureDialog component
// Modify the apply() function
```

---

### 8. Matrix Size Change Validation ⏳

#### What Needs To Be Done:
1. **Before changing matrix size**:
   - If changing from 6x6 to 5x5:
     - Check if any risks have likelihood=6 or impact=6
     - If yes, block the change with error message
     - Show: "Cannot change to 5x5: X risks use level 6. Archive them first."
   - If changing from 5x5 to 6x6:
     - Allow (no breaking changes)

2. **Implementation Steps**:
   - Modify `handleSizeChange()` in ConfigureDialog
   - Query risks table for max scores
   - Block with dialog if risks would be invalid

**Code Location to Modify**:
```typescript
// Around line 1190 in App.tsx
// Look for handleSizeChange function
const handleSizeChange = (val: string) => {
    // Add validation here before setDraft
};
```

---

### 9. User Deletion Enhancement ⏳

#### What Needs To Be Done:
1. **Enhanced User Deletion Dialog**:
   - Show risk count for user
   - Three options:
     - **Transfer to another user**: Select user from dropdown
     - **Archive risks**: Archive all user's risks
     - **Cancel**: Don't delete
   - Soft delete user (status='deleted' instead of hard delete)

2. **Implementation Steps**:
   - Modify `AdminDashboard.tsx` `deleteUser()` function
   - Create new SQL function `soft_delete_user()`
   - Create SQL function `transfer_risks_to_user()`
   - Build enhanced deletion dialog component

**Code Location to Modify**:
```typescript
// AdminDashboard.tsx lines 115-133
const deleteUser = async (userId: string, userEmail: string) => {
    // Replace with enhanced dialog
};
```

**New SQL Functions Needed**:
```sql
CREATE OR REPLACE FUNCTION soft_delete_user(target_user_id uuid)
CREATE OR REPLACE FUNCTION transfer_risks_to_user(from_user_id uuid, to_user_id uuid)
```

---

### 10. Risk Deletion Approval Workflow ⏳

#### What Needs To Be Done:
1. **Non-Admin Users**:
   - When clicking "Delete" button on a risk
   - Instead of deleting, call `requestDeletion()`
   - Show message: "Deletion request submitted for admin approval"

2. **Admin Users**:
   - Add "Pending Deletions" section to Admin Dashboard
   - Show table of pending deletion requests
   - For each request, show:
     - Requester email, risk code, risk title, reason, date
   - Two buttons per request:
     - **Approve & Archive**: Approve with archiving
     - **Approve & Delete**: Approve without archiving
     - **Reject**: Reject the request

3. **Implementation Steps**:
   - Modify risk deletion logic in App.tsx
   - Add "Pending Deletions" tab to AdminDashboard
   - Create PendingDeletions component
   - Update RiskRegisterTab delete button behavior based on user role

**Code Locations to Modify**:
```typescript
// App.tsx - RiskRegisterTab
// Modify onRemove handler based on userRole

// AdminDashboard.tsx
// Add new <TabsTrigger> for "Pending Deletions"
// Create <PendingDeletionsTab /> component
```

---

## 📋 TESTING CHECKLIST

Before deploying to production, test these scenarios in development:

### Archive Management Tests:
- [ ] View archived risks
- [ ] View archived risk details with controls
- [ ] Permanently delete archived risk with password verification
- [ ] Try wrong password (should fail)
- [ ] Verify permanent deletion removes from database

### Audit Trail Tests:
- [ ] View audit entries
- [ ] Filter by action type
- [ ] Filter by entity type
- [ ] Search by user email and risk code
- [ ] View audit entry details

### Configuration Protection Tests:
- [ ] Try to remove a division that has risks (should show warning)
- [ ] Archive risks and then remove division (should work)
- [ ] Remove unused division (should work immediately)
- [ ] Same for departments and categories

### Matrix Size Tests:
- [ ] Change from 5x5 to 6x6 (should work)
- [ ] Create risk with likelihood=6
- [ ] Try to change back to 5x5 (should block with error)
- [ ] Archive the risk with level 6
- [ ] Try to change to 5x5 again (should work)

### User Deletion Tests:
- [ ] Delete user with no risks (should work)
- [ ] Delete user with risks - choose "Archive"
- [ ] Delete user with risks - choose "Transfer"
- [ ] Verify risks are transferred/archived correctly

### Risk Deletion Approval Tests:
- [ ] As non-admin, request risk deletion
- [ ] Verify request appears in Admin Dashboard
- [ ] As admin, approve with archive
- [ ] As admin, approve without archive
- [ ] As admin, reject request
- [ ] Verify risk is handled correctly in each case

---

## 🚀 DEPLOYMENT STEPS

1. **Test in Development**:
   - Complete all tests in checklist above
   - Fix any bugs found

2. **Commit Changes**:
   ```bash
   git add .
   git commit -m "Add archive management, audit trail, and data protection features"
   git push
   ```

3. **Run SQL Migration in Production**:
   - Open Supabase SQL Editor (production project)
   - Run `supabase-migration-archive-audit.sql`
   - Verify tables and functions created

4. **Deploy to Vercel**:
   - Push to GitHub triggers automatic deployment
   - Monitor build logs
   - Test in production

---

## 📁 FILES MODIFIED/CREATED

### New Files Created:
1. `src/lib/archive.ts` - Archive and audit helper functions
2. `src/components/ArchiveManagement.tsx` - Archive UI
3. `src/components/AuditTrail.tsx` - Audit Trail UI
4. `supabase-migration-archive-audit.sql` - Database migration
5. `MIGRATION-INSTRUCTIONS.md` - Migration guide
6. `IMPLEMENTATION-STATUS.md` - This file

### Files Modified:
1. `src/components/AdminDashboard.tsx` - Added tabs for Archive and Audit Trail

### Files To Be Modified (Remaining Work):
1. `src/App.tsx` - Configuration protection, matrix validation
2. `src/components/AdminDashboard.tsx` - User deletion enhancement, pending deletions tab
3. Need to create: `src/components/PendingDeletions.tsx`
4. Need SQL: Additional functions for user operations

---

## 🔧 NEXT STEPS

To continue implementation, work through items 7-10 in order:

1. **Start with Configuration Protection** (Easiest)
   - Modify ConfigureDialog in App.tsx
   - Add warning dialogs
   - Integrate archive functions

2. **Then Matrix Size Validation** (Medium)
   - Add validation to handleSizeChange
   - Query for max scores
   - Block invalid changes

3. **Then User Deletion Enhancement** (Medium-Hard)
   - Create new SQL functions
   - Build enhanced dialog
   - Implement transfer/archive logic

4. **Finally Risk Deletion Approval** (Complex)
   - Modify delete behavior for non-admins
   - Create PendingDeletions component
   - Add admin approval interface

Each feature is independent, so they can be implemented in any order if needed.
