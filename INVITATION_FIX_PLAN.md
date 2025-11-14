# Complete Invitation System Fix - Production-Grade Implementation

**Date**: 2025-11-14
**Status**: PLANNING
**Priority**: CRITICAL

## Executive Summary

The MinRisk invitation system has three critical architectural issues that compound to create a broken user onboarding experience:

1. **Role System Mismatch** - Frontend, backend, and database use incompatible role values
2. **Missing Password Setup Flow** - Users can't set passwords after accepting invitations
3. **Race Condition in Profile Creation** - Profile created with defaults before invitation metadata is applied

## Current State Analysis

### Problem 1: Role System Mismatch

**Database Schema** (`20251113_delegated_admin_model_fixed.sql:23`):
```sql
CHECK (role IN ('primary_admin', 'secondary_admin', 'user'))
```

**Frontend Code** (`AdminDashboard.tsx:122`):
```typescript
const approveUser = async (userId: string, role: 'admin' | 'edit' | 'view_only')
```

**Old RPC Function** (`user-approval-functions-with-audit.sql:27`):
```sql
SELECT organization_id, role = 'admin' INTO v_org_id, v_is_admin
```

**Result**: Database rejects `'admin'`, `'edit'`, `'view_only'` values with constraint violation error 23514.

### Problem 2: Missing Password Setup Flow

**Current Flow**:
1. Super Admin invites user via Admin tab
2. User receives email with magic link
3. User clicks link → Supabase Auth creates account
4. User lands in app with temporary session
5. Session expires → **USER CANNOT LOG IN** (no password set)

**What's Missing**:
- Password setup page/component
- Redirect logic after invitation acceptance
- User communication about password requirements

### Problem 3: Race Condition (Partially Fixed)

**Before Fix** (commit 7c56f22):
- Frontend called `getOrCreateUserProfile(user.id)` without metadata
- Profile created with hardcoded defaults immediately
- Edge Function's attempt to update profile came too late

**After Fix** (commit 7c56f22):
- Frontend now calls `getOrCreateUserProfile(user.id, user.user_metadata)`
- Function reads invitation data from metadata
- **BUT**: Render deployment hasn't applied this fix yet

## The Complete Fix - Production-Grade Solution

### Phase 1: Role System Standardization (30 min)

**Goal**: Single source of truth for role values across all layers.

**Files to Modify**:
1. `src/components/AdminDashboard.tsx:122` - Update role types
2. `user-approval-functions-with-audit.sql` - Rewrite approve_user RPC function
3. `src/lib/database.ts` - Ensure consistent role handling

**Role Hierarchy (Final)**:
```
super_admin (platform level, in is_super_admin_users table)
  └── primary_admin (organization owner)
      └── secondary_admin (organization admin)
          └── user (regular user)
```

**Actions**:
- [ ] Update AdminDashboard.tsx role types to match database
- [ ] Rewrite approve_user() RPC function with new roles
- [ ] Deploy SQL function to Supabase
- [ ] Test approval workflow

### Phase 2: Invitation Flow Redesign (60 min)

**Goal**: Complete, secure invitation flow with password setup.

**New Flow**:
```
1. Super Admin creates organization
2. Super Admin invites Primary Admin
3. Primary Admin receives email
4. Clicks link → Auth creates account with metadata
5. **NEW**: Redirects to SetPasswordPage component
6. User sets secure password
7. User sees "Awaiting Approval" if needed OR enters app if auto-approved
```

**Files to Create**:
- `src/components/SetPasswordPage.tsx` - Password setup UI
- `src/components/InvitationHandler.tsx` - Handles invitation flow routing

**Files to Modify**:
- `src/App.tsx` - Add invitation flow detection
- `src/lib/database.ts` - Update getOrCreateUserProfile logic
- `supabase/functions/invite-user/index.ts` - Add password setup redirect

**Actions**:
- [ ] Create SetPasswordPage component with validation
- [ ] Create InvitationHandler routing component
- [ ] Update App.tsx to detect invitation flow
- [ ] Update invite-user Edge Function redirect_to URL
- [ ] Add password strength requirements
- [ ] Test complete flow

### Phase 3: Metadata-Driven Profile Creation (30 min)

**Goal**: Ensure profile is ALWAYS created with correct invitation metadata.

**Current Issue**:
- Render hasn't deployed fix from commit 7c56f22
- Console logs missing "User metadata:" output

**Files Already Fixed**:
- `src/lib/database.ts:135-201` ✅
- `src/App.tsx:414` ✅

**Actions**:
- [ ] Verify Render deployment status
- [ ] Force redeploy if needed
- [ ] Add comprehensive logging to profile creation
- [ ] Test with new invitation

### Phase 4: Error Handling & Edge Cases (30 min)

**Goal**: Handle all failure scenarios gracefully.

**Edge Cases to Handle**:
- User clicks invitation link twice
- User sets password then refreshes before approval
- Organization is deleted before user accepts invitation
- Network errors during profile creation
- Database constraint violations

**Actions**:
- [ ] Add try-catch blocks with specific error messages
- [ ] Create user-friendly error pages
- [ ] Add retry logic for transient failures
- [ ] Log all errors for debugging
- [ ] Add audit trail entries for failures

### Phase 5: Testing & Validation (30 min)

**Test Cases**:
1. **Happy Path**: Invite → Accept → Set Password → Auto-approve → Login
2. **Manual Approval**: Invite → Accept → Set Password → Pending → Super Admin Approves → Login
3. **Rejection**: Invite → Accept → Set Password → Super Admin Rejects → User blocked
4. **Duplicate**: Invite → Accept → Click link again → Show appropriate message
5. **Expired**: Invite → Wait 24h → Click link → Show expired message

**Actions**:
- [ ] Run all test cases
- [ ] Document results
- [ ] Fix any issues found
- [ ] Get user acceptance

## Implementation Order

### Step 1: Clean Up Current State (5 min)
```sql
-- Delete broken test user
DELETE FROM audit_trail WHERE user_id = '9fce626c-c27a-4823-abb1-a2503ca95449';
DELETE FROM user_profiles WHERE id = '9fce626c-c27a-4823-abb1-a2503ca95449';
DELETE FROM auth.users WHERE id = '9fce626c-c27a-4823-abb1-a2503ca95449';
```

### Step 2: Fix Role System (30 min)
1. Update database RPC function
2. Update frontend AdminDashboard
3. Deploy and test approval

### Step 3: Build Invitation Flow (60 min)
1. Create SetPasswordPage component
2. Create InvitationHandler routing
3. Update App.tsx flow detection
4. Test invitation acceptance

### Step 4: Verify Metadata Fix (30 min)
1. Check Render deployment
2. Redeploy if needed
3. Test profile creation with metadata

### Step 5: Error Handling (30 min)
1. Add comprehensive error handling
2. Create error pages
3. Test edge cases

### Step 6: End-to-End Testing (30 min)
1. Run all test cases
2. Document results
3. Fix any issues

## Critical Files Reference

### Database Schema
- `supabase/migrations/20251113_delegated_admin_model_fixed.sql:23` - Role constraint
- `user-approval-functions-with-audit.sql:9-60` - approve_user() RPC function

### Frontend Components
- `src/App.tsx:414` - Profile creation call
- `src/components/AdminDashboard.tsx:122` - User approval
- `src/lib/database.ts:135-201` - getOrCreateUserProfile()

### Edge Functions
- `supabase/functions/invite-user/index.ts:144-148` - Sets user_metadata

## Success Criteria

✅ User can accept invitation and set password
✅ Profile created with correct organization_id and role
✅ Auto-approval works for invited users
✅ Manual approval works for self-signup users
✅ User can log in with email/password after setup
✅ No race conditions or constraint violations
✅ Clear error messages for all failure scenarios
✅ Audit trail tracks all invitation events

## Rollback Plan

If issues arise during implementation:
1. Revert to commit before changes
2. Document specific failure
3. Create isolated test environment
4. Fix issue in isolation
5. Re-deploy with additional testing

## Database Backup

Before making any changes:
```bash
# Backup current state
pg_dump --format=custom --file=minrisk_backup_$(date +%Y%m%d_%H%M%S).dump $DATABASE_URL
```

## Contact & Escalation

If blockers occur:
- Check Supabase logs: https://supabase.com/dashboard/project/_/logs
- Check Render logs: https://dashboard.render.com/
- Review this document for next steps
- Document blockers in BLOCKERS.md

## Notes

- Commit 7c56f22 contains the metadata-driven profile creation fix
- Frontend changes are in src/App.tsx and src/lib/database.ts
- Render deployment appears stalled or cached
- Test user ayodele.onawunmi@fmdqgroup.com (ID: 9fce626c-c27a-4823-abb1-a2503ca95449) needs deletion
- Organization "213 LLC Mauritius" (ID: ddfd7bbe-d2a3-47c0-a01d-3ae9f5493380) is test org

---
**Last Updated**: 2025-11-14
**Next Review**: After each phase completion
