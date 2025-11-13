# Super Admin Setup - COMPLETE ✅

## Status: Successfully Deployed
**Date Completed:** November 13, 2025
**Super Admin:** ayodele.onawunmi@gmail.com
**User ID:** a2af3424-53cb-45c4-9064-a603a9ab50b0

---

## ✅ What Was Accomplished

### 1. Database Migration (SUCCESSFUL)
- ✅ Added `active` column to existing `organizations` table
- ✅ Created `is_super_admin()` function to check super admin status
- ✅ Created `list_organizations()` function to view all orgs with stats
- ✅ Enabled Row-Level Security (RLS) on organizations table
- ✅ Created RLS policies for super admin access
- ✅ Created performance indexes
- ✅ Migration file: `supabase/migrations/20251113_super_admin_v5_alter.sql`

### 2. Super Admin User Setup (SUCCESSFUL)
- ✅ Made ayodele.onawunmi@gmail.com a super admin
- ✅ Updated `auth.users.raw_user_meta_data` with `is_super_admin: true`
- ✅ Verified super admin status in database
- ✅ Confirmed access to organizations table

### 3. Current System State
- ✅ One organization exists: "Default Organization" (ID: b32999f8-eab2-43e7-bb46-ccff0de17cf5)
- ✅ Super admin can view/create/update organizations
- ✅ Database-level multi-tenancy ready
- ✅ RLS policies active and enforced

---

## 🎯 How Multi-Tenancy Works

### Architecture Overview

```
┌─────────────────────────────────────────┐
│    Super Admin (ayodele.onawunmi)       │
│    is_super_admin = TRUE                 │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Organizations Table              │
│  - Default Organization                  │
│  - ABC Bank (future)                     │
│  - XYZ Corp (future)                     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│          User Profiles Table             │
│  - Each user linked to one organization  │
│  - organization_id foreign key           │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│            Risks Table                   │
│  - Each risk linked to one organization  │
│  - RLS enforces data isolation           │
└─────────────────────────────────────────┘
```

### Data Isolation Strategy

**Database-Level Multi-Tenancy:**
- Single database, single application instance
- All organizations share same tables
- `organization_id` column on all tables
- Row-Level Security (RLS) enforces isolation
- Users only see data from their organization
- Super admin sees ALL data across ALL organizations

**Benefits:**
- ✅ Cost-effective (one container, one database)
- ✅ Easy to manage and update
- ✅ Shared resources = lower hosting costs
- ✅ Centralized monitoring and backups

**Cost Comparison:**
- Current approach: $0-32/month for unlimited organizations
- Container-per-tenant: $320/month for 10 organizations
- **Savings: ~90%**

---

## 📋 How to Add New Organizations

### Option 1: Via SQL (Current Method)

#### Step 1: Create the Organization
```sql
INSERT INTO organizations (name, active)
VALUES ('ABC Bank', TRUE)
RETURNING id, name, created_at;
```

#### Step 2: Invite Admin User
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Invite User"
3. Enter email: `admin@abcbank.com`
4. User receives invite email and sets password

#### Step 3: Link Admin to Organization
```sql
-- Get the organization ID from Step 1
SELECT id FROM organizations WHERE name = 'ABC Bank';

-- Link user to organization
UPDATE user_profiles
SET organization_id = 'paste-org-id-here',
    role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@abcbank.com');
```

#### Step 4: Admin Creates More Users
- ABC Bank admin logs in
- Goes to Configuration → User Management
- Creates users for their organization
- All users automatically linked to ABC Bank

### Option 2: Via UI (Future Enhancement)

**Super Admin Panel** (to be built):
- List all organizations with stats
- Create new organization button
- Create admin user for organization
- Toggle organization active/inactive
- View organization details and usage
- All in one intuitive interface

---

## 🔧 Super Admin SQL Commands

### Check Your Super Admin Status
```sql
SELECT is_super_admin();
-- Should return: true
```

### View All Organizations
```sql
SELECT * FROM list_organizations();
-- Returns: id, name, created_at, active, risk_count
```

### Create New Organization
```sql
INSERT INTO organizations (name, active)
VALUES ('XYZ Corporation', TRUE)
RETURNING *;
```

### Toggle Organization Status
```sql
-- Disable organization
UPDATE organizations
SET active = FALSE
WHERE name = 'XYZ Corporation';

-- Enable organization
UPDATE organizations
SET active = TRUE
WHERE name = 'XYZ Corporation';
```

### View All Users by Organization
```sql
SELECT
  o.name as organization,
  COUNT(up.id) as user_count,
  COUNT(CASE WHEN up.role = 'admin' THEN 1 END) as admin_count
FROM organizations o
LEFT JOIN user_profiles up ON up.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY user_count DESC;
```

### View All Risks by Organization
```sql
SELECT
  o.name as organization,
  COUNT(r.id) as risk_count,
  COUNT(CASE WHEN r.status = 'Open' THEN 1 END) as open_risks
FROM organizations o
LEFT JOIN risks r ON r.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY risk_count DESC;
```

### Make Another User a Super Admin
```sql
-- Replace with actual email
UPDATE auth.users
SET raw_user_meta_data =
  COALESCE(raw_user_meta_data, '{}'::jsonb) ||
  '{"is_super_admin": true}'::jsonb
WHERE email = 'another.admin@example.com';

-- Verify
SELECT
  email,
  raw_user_meta_data->>'is_super_admin' as is_super_admin
FROM auth.users
WHERE email = 'another.admin@example.com';
```

---

## 🔐 Security & Access Control

### Row-Level Security (RLS) Policies

**For Organizations Table:**
```sql
-- Super admins can SELECT
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Super admins can INSERT
CREATE POLICY "Super admins can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- Super admins can UPDATE
CREATE POLICY "Super admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_super_admin());
```

**For User Profiles:**
- Regular users: see only users in their organization
- Admins: see all users in their organization
- Super admins: see ALL users across ALL organizations

**For Risks:**
- Regular users: see only their own risks
- Admins: see all risks in their organization
- Super admins: see ALL risks across ALL organizations

### Best Practices

1. **Limit Super Admins** - Only 1-2 trusted people
2. **Use Strong Passwords** - Enforce for super admin accounts
3. **Enable 2FA** - In Supabase Auth settings
4. **Audit Trail** - Log all super admin actions
5. **Regular Reviews** - Check RLS policies quarterly
6. **Backup Strategy** - Regular database backups via Supabase

---

## 📊 Monitoring & Analytics

### System Health Queries

**Organization Overview:**
```sql
SELECT
  COUNT(*) as total_organizations,
  COUNT(CASE WHEN active = TRUE THEN 1 END) as active_orgs,
  COUNT(CASE WHEN active = FALSE THEN 1 END) as inactive_orgs
FROM organizations;
```

**User Distribution:**
```sql
SELECT
  o.name as organization,
  COUNT(up.id) as total_users,
  COUNT(CASE WHEN up.role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN up.role = 'user' THEN 1 END) as regular_users
FROM organizations o
LEFT JOIN user_profiles up ON up.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY total_users DESC;
```

**Risk Statistics:**
```sql
SELECT
  o.name as organization,
  COUNT(r.id) as total_risks,
  COUNT(CASE WHEN r.status = 'Open' THEN 1 END) as open_risks,
  COUNT(CASE WHEN r.status = 'Closed' THEN 1 END) as closed_risks
FROM organizations o
LEFT JOIN risks r ON r.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY total_risks DESC;
```

---

## 🚀 Next Steps

### Immediate (Manual Process)
- ✅ Super admin setup complete
- ✅ Database ready for multi-tenant use
- ✅ Can create organizations via SQL
- ✅ Can invite users via Supabase Auth

### Short-Term (UI Enhancement)
- [ ] Build Super Admin Panel React component
- [ ] Add "Super Admin" tab in MinRisk UI
- [ ] List all organizations with stats
- [ ] Create organization button
- [ ] Invite admin user button
- [ ] Toggle organization active/inactive
- [ ] View organization details

### Medium-Term (Features)
- [ ] Organization usage metrics
- [ ] Billing per organization (if needed)
- [ ] Email notifications for new orgs
- [ ] Audit log for super admin actions
- [ ] Organization export/import
- [ ] Bulk user management

### Long-Term (Advanced)
- [ ] Self-service organization signup
- [ ] Payment integration (Stripe, etc.)
- [ ] Custom branding per organization
- [ ] Advanced analytics dashboard
- [ ] API access for integrations

---

## 🐛 Troubleshooting

### Issue: Can't see organizations table
**Solution:**
```sql
-- Check if you're recognized as super admin
SELECT is_super_admin();

-- If returns FALSE, run:
UPDATE auth.users
SET raw_user_meta_data =
  COALESCE(raw_user_meta_data, '{}'::jsonb) ||
  '{"is_super_admin": true}'::jsonb
WHERE email = 'ayodele.onawunmi@gmail.com';
```

### Issue: User can't access their organization's data
**Solution:**
```sql
-- Check user's organization assignment
SELECT id, email, organization_id, role
FROM user_profiles
WHERE email = 'user@example.com';

-- If organization_id is NULL, assign it:
UPDATE user_profiles
SET organization_id = 'correct-org-id'
WHERE email = 'user@example.com';
```

### Issue: Organization appears inactive
**Solution:**
```sql
-- Reactivate organization
UPDATE organizations
SET active = TRUE,
    updated_at = NOW()
WHERE name = 'Organization Name';
```

---

## 📝 Migration Files Reference

### Files Created During Setup:
1. `supabase/migrations/20251113_super_admin.sql` (v1 - failed, users table issue)
2. `supabase/migrations/20251113_super_admin_v2.sql` (v2 - failed, is_active column issue)
3. `supabase/migrations/20251113_super_admin_v3_minimal.sql` (v3 - failed, active column issue)
4. `supabase/migrations/20251113_super_admin_v4_fixed.sql` (v4 - would work but drops table)
5. **`supabase/migrations/20251113_super_admin_v5_alter.sql` (v5 - SUCCESSFUL!)** ✅

### Why v5 Worked:
- Used `ALTER TABLE` instead of `DROP TABLE`
- Added `active` column to existing organizations table
- Preserved existing data and relationships
- No conflicts with existing ERM reporting setup

---

## 🔗 Important Links

- **Live App:** https://minrisk-starter.onrender.com
- **Supabase Dashboard:** https://supabase.com/dashboard/project/cnywkjfkhnwptceluvzs
- **SQL Editor:** https://supabase.com/dashboard/project/cnywkjfkhnwptceluvzs/sql
- **Authentication:** https://supabase.com/dashboard/project/cnywkjfkhnwptceluvzs/auth/users
- **Render Dashboard:** https://dashboard.render.com
- **GitHub Repo:** https://github.com/aonawunmi/minrisk-starter

---

## 📞 Support

For questions or issues:
1. Check this document first
2. Review `SUPER_ADMIN_SETUP.md` for detailed setup guide
3. Check `TODO.md` for deployment info
4. Review Supabase logs for database errors
5. Check Render logs for deployment issues

---

**Document Version:** 1.0
**Last Updated:** November 13, 2025
**Status:** Production Ready ✅
