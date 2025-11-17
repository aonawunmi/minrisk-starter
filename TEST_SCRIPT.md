# MinRisk System Test Script
**Version:** 1.0
**Date:** November 16, 2025
**Purpose:** Comprehensive testing of role-based permissions and data isolation

---

## Test Environment
- **Production URL:** https://minrisk-starter.onrender.com
- **Database:** PostgreSQL (Supabase)
- **Organization ID:** ddfd7bbe-d2a3-47c0-a01d-3ae9f5493380

## Test Users

| User | Email | Password | Role | User ID | Expected Risks |
|------|-------|----------|------|---------|----------------|
| Primary Admin | primary.admin@test.com | test123 | primary_admin | dd3c23ac-1604-4418-9b9c-16fe4c42ac98 | All 15 risks (5 own + 10 from others) |
| Regular User | regular.user@test.com | test123 | user | a1ca349a-48c1-4223-bae2-bb809489ab08 | Only their own 5 risks |

---

## Test Suite 1: Risk Register Access (CRITICAL)

### Test 1.1: Primary Admin - Organization-Wide Risk Visibility ✅
**Role:** Primary Admin (primary.admin@test.com)
**Expected Behavior:** Can see ALL risks in the organization (15 total)

**Test Steps:**
1. Open https://minrisk-starter.onrender.com in browser
2. Log in as primary.admin@test.com / test123
3. Open DevTools Console (F12)
4. Navigate to "Risk Register" tab
5. Observe console logs and risk count

**Expected Results:**
- ✅ Console shows: `role='primary_admin'`
- ✅ Console shows: `isAdmin=true` or "ADMIN - org-wide"
- ✅ Risk Register displays **15 risks total**
- ✅ Risks include both:
  - 5 risks owned by primary.admin@test.com (dd3c23ac-1604-4418-9b9c-16fe4c42ac98)
  - 10 risks owned by regular.user@test.com (a1ca349a-48c1-4223-bae2-bb809489ab08)

**Actual Results:**
- ✅ **PASS** - Primary admin sees all 15 risks

**Notes:**
- Fixed in commit ff2a17e (TypeScript build errors)
- RLS policies allow primary_admin and secondary_admin to access all org risks

---

### Test 1.2: Regular User - Personal Risk Isolation ⏳
**Role:** Regular User (regular.user@test.com)
**Expected Behavior:** Can only see THEIR OWN risks (5 total)

**Test Steps:**
1. Log out from primary admin account
2. Log in as regular.user@test.com / test123
3. Open DevTools Console (F12)
4. Navigate to "Risk Register" tab
5. Observe console logs and risk count

**Expected Results:**
- ✅ Console shows: `role='user'`
- ✅ Console shows: "USER - personal only"
- ✅ Risk Register displays **5 risks only**
- ✅ All 5 risks are owned by regular.user@test.com (a1ca349a-48c1-4223-bae2-bb809489ab08)
- ❌ Cannot see risks owned by primary.admin@test.com

**Actual Results:**
- ⏳ **PENDING** - Awaiting test execution

**SQL Verification Query:**
```sql
-- Count risks owned by regular user
SELECT COUNT(*) as user_risk_count
FROM risks
WHERE organization_id = 'ddfd7bbe-d2a3-47c0-a01d-3ae9f5493380'
  AND user_id = 'a1ca349a-48c1-4223-bae2-bb809489ab08';
-- Expected: 10 (but user should only see 10, not all 15)
```

---

## Test Suite 2: Admin Dashboard Access

### Test 2.1: Primary Admin - Admin Dashboard Visibility ⏳
**Role:** Primary Admin
**Expected Behavior:** Can access Admin Dashboard tab

**Test Steps:**
1. Log in as primary.admin@test.com
2. Check top navigation tabs

**Expected Results:**
- ✅ "Admin Dashboard" tab is visible
- ✅ Can click and access Admin Dashboard
- ✅ See sections: User Management, Configuration, KRI Management, etc.

**Actual Results:**
- ⏳ **PENDING**

---

### Test 2.2: Regular User - Admin Dashboard Hidden ⏳
**Role:** Regular User
**Expected Behavior:** Cannot see or access Admin Dashboard

**Test Steps:**
1. Log in as regular.user@test.com
2. Check top navigation tabs

**Expected Results:**
- ❌ "Admin Dashboard" tab is NOT visible
- ❌ Cannot access admin features

**Actual Results:**
- ⏳ **PENDING**

---

## Test Suite 3: User Role Permissions (Per SYSTEM_SPECIFICATIONS.MD)

### Test 3.1: Risk Register Operations

| Operation | Regular User | Primary Admin |
|-----------|--------------|---------------|
| View All Org Risks | ❌ No (own only) | ✅ Yes |
| Create Risk | ✅ Yes | ✅ Yes |
| Edit Own Risk | ✅ Yes | ✅ Yes |
| Edit Other's Risk | ❌ No | ✅ Yes |
| Delete Own Risk | Request | ✅ Immediate |
| Delete Other's Risk | ❌ No | ✅ Yes |

**Test Steps:**
1. **As Regular User:**
   - Create a new risk → Should succeed ✅
   - Try to edit another user's risk → Should fail ❌
   - Try to delete own risk → Shows approval dialog (Request) 📝

2. **As Primary Admin:**
   - Edit any risk → Should succeed ✅
   - Delete any risk → Should succeed immediately ✅

**Actual Results:**
- ⏳ **PENDING**

---

### Test 3.2: KRI Module Access

| Operation | Regular User | Primary Admin |
|-----------|--------------|---------------|
| View KRIs | ✅ All org KRIs | ✅ All org KRIs |
| Enter KRI Data | ✅ Any KRI | ✅ Any KRI |
| View Dashboard | ✅ Org-wide | ✅ Org-wide |
| View Alerts | ✅ Org-wide | ✅ Org-wide |
| Define New KRIs | ❌ No | ✅ Admin only |
| Edit KRI Definitions | ❌ No | ✅ Admin only |
| Delete KRIs | ❌ No | ✅ Admin only |

**Test Steps:**
1. **As Regular User:**
   - Navigate to "KRI Monitoring" tab
   - Check if "Data Entry" is available → Should be ✅
   - Check if "Management" tab is visible → Should NOT be visible ❌

2. **As Primary Admin:**
   - Navigate to "Admin Dashboard" → "KRI Management"
   - Check if "Define New KRI" is available → Should be ✅
   - Check if can edit/delete KRIs → Should be ✅

**Actual Results:**
- ⏳ **PENDING**

---

### Test 3.3: Incident Management

| Operation | Regular User | Primary Admin |
|-----------|--------------|---------------|
| View Incidents | ✅ Yes | ✅ Yes |
| Create Incident | ✅ Yes | ✅ Yes |
| Edit Incident | ✅ Yes | ✅ Yes |
| Delete Incident | ❌ No | ✅ Yes |
| AI Analysis | ✅ Yes | ✅ Yes |

**Test Steps:**
1. **As Regular User:**
   - Create an incident → Should succeed ✅
   - Try to delete incident → Should fail ❌

2. **As Primary Admin:**
   - Delete any incident → Should succeed ✅

**Actual Results:**
- ⏳ **PENDING**

---

### Test 3.4: System Configuration

| Operation | Regular User | Primary Admin |
|-----------|--------------|---------------|
| View Configuration | ❌ No | ✅ Yes |
| Edit Risk Matrix | ❌ No | ✅ Yes |
| Edit Categories | ❌ No | ✅ Yes |
| Manage Users | ❌ No | ✅ Yes |
| View Audit Trail | ❌ No | ✅ Yes |

**Test Steps:**
1. **As Regular User:**
   - Try to access configuration → Should be hidden ❌

2. **As Primary Admin:**
   - Access "Admin Dashboard" → "Configuration"
   - Verify can edit matrix size, categories, etc. ✅

**Actual Results:**
- ⏳ **PENDING**

---

## Test Suite 4: Report Generation

### Test 4.1: Primary Admin - Report Access to All Risks ⏳
**Role:** Primary Admin
**Expected Behavior:** Generated reports include ALL 15 risks

**Test Steps:**
1. Log in as primary.admin@test.com
2. Navigate to "Reports" tab
3. Generate a report for the organization
4. Check report contents

**Expected Results:**
- ✅ Report includes data from all 15 risks
- ✅ Report shows org-wide statistics
- ✅ Can export to PDF/Excel

**Actual Results:**
- ⏳ **PENDING**

---

### Test 4.2: Regular User - Report Limited to Own Risks ⏳
**Role:** Regular User
**Expected Behavior:** Generated reports only include their 5 risks

**Test Steps:**
1. Log in as regular.user@test.com
2. Navigate to "Reports" tab
3. Generate a report
4. Check report contents

**Expected Results:**
- ✅ Report includes only 5 risks (own risks)
- ❌ Does not include other users' risks

**Actual Results:**
- ⏳ **PENDING**

---

## Test Suite 5: RLS Policy Verification (Database Level)

### Test 5.1: Verify RLS Policies Exist
**Purpose:** Confirm Row-Level Security policies are active

**SQL Query:**
```sql
-- Check user_profiles policies (should have 3)
SELECT 'user_profiles policies:' as check, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'user_profiles';

-- Check risks policies (should have 4)
SELECT 'risks policies:' as check, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'risks';
```

**Expected Results:**
- ✅ user_profiles: 3 policies
- ✅ risks: 4 policies

**Actual Results:**
- ✅ **PASS** - Verified both tables have correct policies

---

### Test 5.2: Test RLS Enforcement for Regular User
**Purpose:** Verify RLS prevents regular users from seeing other users' risks

**SQL Query:**
```sql
-- As regular user, should only see own risks
SET LOCAL role 'authenticated';
SET LOCAL request.jwt.claim.sub TO 'a1ca349a-48c1-4223-bae2-bb809489ab08';

SELECT COUNT(*) as visible_risks
FROM risks
WHERE organization_id = 'ddfd7bbe-d2a3-47c0-a01d-3ae9f5493380';

-- Should return 10 (only regular user's risks)
```

**Expected Results:**
- ✅ Regular user sees only 10 risks (not 15)

**Actual Results:**
- ⏳ **PENDING**

---

### Test 5.3: Test RLS Admin Override
**Purpose:** Verify RLS allows primary_admin to see all org risks

**SQL Query:**
```sql
-- As primary admin, should see all org risks
SET LOCAL role 'authenticated';
SET LOCAL request.jwt.claim.sub TO 'dd3c23ac-1604-4418-9b9c-16fe4c42ac98';

SELECT COUNT(*) as visible_risks
FROM risks
WHERE organization_id = 'ddfd7bbe-d2a3-47c0-a01d-3ae9f5493380';

-- Should return 15 (all org risks)
```

**Expected Results:**
- ✅ Primary admin sees all 15 risks

**Actual Results:**
- ✅ **PASS** - Verified in application (Test 1.1)

---

## Test Suite 6: Edge Cases & Security

### Test 6.1: Cross-Organization Isolation ⏳
**Purpose:** Verify users cannot see risks from other organizations

**Test Steps:**
1. Create a second organization with test users
2. Log in as user from Org A
3. Verify cannot see risks from Org B

**Expected Results:**
- ✅ Complete isolation between organizations
- ❌ No cross-org data leakage

**Actual Results:**
- ⏳ **PENDING** (requires second org setup)

---

### Test 6.2: Role Escalation Prevention ⏳
**Purpose:** Verify regular users cannot escalate to admin privileges

**Test Steps:**
1. Log in as regular.user@test.com
2. Try to access admin endpoints directly
3. Check console for unauthorized access attempts

**Expected Results:**
- ❌ All admin endpoints return 403 Forbidden
- ✅ RLS prevents unauthorized data access

**Actual Results:**
- ⏳ **PENDING**

---

### Test 6.3: Audit Trail Logging ⏳
**Purpose:** Verify all actions are logged

**Test Steps:**
1. As primary admin, view audit trail
2. Perform various actions (create, edit, delete risk)
3. Check audit trail for entries

**Expected Results:**
- ✅ All actions appear in audit trail with:
  - Timestamp
  - User email
  - Action type
  - Before/after values

**Actual Results:**
- ⏳ **PENDING**

---

## Test Results Summary

### Completed Tests ✅
1. **Test 1.1** - Primary Admin sees all 15 risks ✅ PASS

### Pending Tests ⏳
1. **Test 1.2** - Regular user sees only own risks
2. **Test 2.1** - Primary admin has Admin Dashboard access
3. **Test 2.2** - Regular user has no Admin Dashboard access
4. **Test 3.x** - Role-based permissions for all modules
5. **Test 4.x** - Report generation for different roles
6. **Test 5.2** - RLS enforcement verification
7. **Test 6.x** - Security and edge cases

### Failed Tests ❌
None currently

---

## Next Steps

1. **Complete Test 1.2:** Verify regular user can only see their own 5 risks
2. **Test Admin Dashboard:** Verify tab visibility for both roles
3. **Test KRI Module:** Verify data entry vs. management permissions
4. **Test Report Generation:** Verify data scope for different roles
5. **Security Testing:** Cross-org isolation and role escalation prevention

---

## Notes
- All tests should be performed on production: https://minrisk-starter.onrender.com
- Clear browser cache between user switches
- Use incognito/private browsing for parallel testing
- Document any unexpected behaviors or errors
- Console logs provide valuable debugging information

---

**Document Version:** 1.0
**Last Updated:** November 16, 2025
**Test Lead:** System Administrator
