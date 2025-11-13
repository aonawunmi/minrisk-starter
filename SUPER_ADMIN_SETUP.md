# Super Admin Setup Guide

## Overview
This guide explains how to set up and use the Super Admin feature for managing multiple organizations in MinRisk.

## Architecture

```
┌─────────────────────────────────────────┐
│         Super Admin User                │
│   (is_super_admin = TRUE)               │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│     Organization Management Panel        │
│  - View all organizations                │
│  - Create new organizations              │
│  - Toggle organization status            │
│  - View org stats (users, risks)         │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│        Multiple Organizations            │
│                                          │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ Org A        │  │ Org B        │    │
│  │ - Admin 1    │  │ - Admin 2    │    │
│  │ - User 1     │  │ - User 3     │    │
│  │ - Risks      │  │ - Risks      │    │
│  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────┘
```

## Step 1: Database Setup

### Run the Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `cnywkjfkhnwptceluvzs`
3. Go to "SQL Editor"
4. Click "New Query"
5. Copy the contents of `supabase/migrations/20251113_super_admin.sql`
6. Paste and click "Run"

### What the Migration Does:

- ✅ Creates `organizations` table (if it doesn't exist)
- ✅ Adds `is_super_admin` column to `users` table
- ✅ Creates helper functions:
  - `create_organization_with_admin()` - Create new organization
  - `list_organizations()` - Get all orgs with stats
  - `toggle_organization_status()` - Enable/disable orgs
- ✅ Sets up Row-Level Security (RLS) policies
- ✅ Creates performance indexes

## Step 2: Make Yourself a Super Admin

Run this SQL in Supabase SQL Editor:

```sql
-- Replace with your actual email
UPDATE users
SET is_super_admin = TRUE
WHERE email = 'your-email@example.com';

-- Verify
SELECT id, email, is_super_admin, role
FROM users
WHERE is_super_admin = TRUE;
```

## Step 3: Using the Super Admin Interface

### Access Super Admin Panel

1. Log in to MinRisk as a super admin user
2. You'll see a new "Super Admin" tab (🔐 icon)
3. Click to access the Organization Management panel

### Create a New Organization

**Method 1: Via UI (Coming Soon)**
- Click "Add Organization" button
- Enter organization name
- Enter admin email
- Generate secure password
- Click "Create"

**Method 2: Via Supabase (Current)**

```sql
-- Step 1: Create organization
INSERT INTO organizations (name, is_active)
VALUES ('ABC Bank', TRUE)
RETURNING id;

-- Copy the returned UUID (organization_id)
```

Then, go to Supabase Authentication → Users → "Invite user":
- Email: admin@abcbank.com
- After they verify email, run:

```sql
-- Step 2: Link user to organization
UPDATE users
SET organization_id = 'paste-org-id-here',
    role = 'admin'
WHERE email = 'admin@abcbank.com';
```

### View All Organizations

The Super Admin panel shows:
- Organization name
- Created date
- Active status (toggle on/off)
- Number of users
- Number of risks
- Actions (Edit, Disable, Delete)

### Disable an Organization

```sql
SELECT toggle_organization_status('org-uuid-here');
```

Or click the toggle in the UI.

**Effect:** Users from disabled organizations cannot log in or access data.

## Step 4: Multi-Tenant Data Flow

### How Data Isolation Works:

1. **User Signs Up/Logs In**
   - User provides email/password
   - Supabase Auth authenticates

2. **Organization Assignment**
   - User record has `organization_id` field
   - Links user to their organization

3. **Data Queries**
   - All queries filter by `organization_id`
   - Row-Level Security enforces isolation
   - Users only see their org's data

4. **Super Admin Exception**
   - `is_super_admin = TRUE` users can see all data
   - Used for platform management only

### Example: User sees only their org's risks

```javascript
// Regular user query (automatic filtering by RLS)
const { data: risks } = await supabase
  .from('risks')
  .select('*');
// Returns only risks where organization_id matches user's org

// Super admin query (sees all)
const { data: allRisks } = await supabase
  .from('risks')
  .select('*, organizations(name)');
// Returns risks from ALL organizations
```

## Step 5: Deployment Workflow

### Adding a New Client Organization

**Scenario:** XYZ Corporation wants to use MinRisk

1. **Create Organization (Super Admin)**
   ```sql
   INSERT INTO organizations (name, is_active)
   VALUES ('XYZ Corporation', TRUE)
   RETURNING id;
   ```

2. **Create Admin User**
   - Go to Supabase → Authentication → Invite User
   - Email: admin@xyzcorp.com
   - They receive email, set password

3. **Link User to Organization**
   ```sql
   UPDATE users
   SET organization_id = 'xyz-org-id',
       role = 'admin'
   WHERE email = 'admin@xyzcorp.com';
   ```

4. **Admin Creates More Users**
   - XYZ admin logs in
   - Goes to Configuration → User Management
   - Creates users for their organization
   - All users automatically linked to XYZ Corporation

5. **Done!**
   - XYZ Corporation has isolated environment
   - Same URL: https://minrisk-starter.onrender.com
   - Different data, different users
   - Zero configuration changes needed

### Adding More Users to Existing Organization

Organization admins can add users themselves:
1. Log in as admin
2. Go to Configuration → User Management
3. Click "Add User"
4. Enter email, assign role
5. User gets invite email

## Security Considerations

### Row-Level Security (RLS) Policies

**Current RLS Policies:**

```sql
-- Users can only see their organization's data
CREATE POLICY "Users see own org data"
ON risks FOR SELECT
TO authenticated
USING (organization_id = (
  SELECT organization_id FROM users WHERE id = auth.uid()
));

-- Super admins see everything
CREATE POLICY "Super admins see all data"
ON risks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_super_admin = TRUE
  )
);
```

### Best Practices:

1. **Limit Super Admins** - Only 1-2 trusted users
2. **Audit Super Admin Actions** - Log all organization changes
3. **Regular Security Reviews** - Check RLS policies quarterly
4. **Strong Passwords** - Enforce for all admin accounts
5. **2FA** - Enable in Supabase Auth settings

## Monitoring & Maintenance

### View System Stats

```sql
-- Get all organizations with stats
SELECT * FROM list_organizations();

-- Get user distribution
SELECT
  o.name,
  COUNT(u.id) as user_count,
  COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin_count
FROM organizations o
LEFT JOIN users u ON u.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY user_count DESC;

-- Get risk distribution
SELECT
  o.name,
  COUNT(r.id) as risk_count,
  COUNT(CASE WHEN r.status = 'Open' THEN 1 END) as open_risks
FROM organizations o
LEFT JOIN risks r ON r.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY risk_count DESC;
```

### Audit Trail

All organization changes should be logged:
- Who created the organization
- When it was created
- Status changes
- Admin assignments

## Cost Analysis

### Current Setup (Database-Level Multi-Tenancy)

**For 10 Organizations:**
- Render: $0 (free tier) or $7/month (starter)
- Supabase: $0 (free tier up to 500MB) or $25/month (pro)
- Total: **$0-32/month for unlimited organizations**

**Cost per organization:** $0-3.20/month

### Alternative (Container-Per-Tenant)

**For 10 Organizations:**
- Render: $7/month × 10 = $70/month
- Supabase: $25/month × 10 = $250/month (if isolated DBs)
- Total: **$320/month**

**Your approach saves ~90% on costs!**

## Troubleshooting

### Issue: User can't see organization data

**Check:**
```sql
-- Verify user has organization_id
SELECT id, email, organization_id, role
FROM users
WHERE email = 'user@example.com';

-- If NULL, assign organization
UPDATE users
SET organization_id = 'correct-org-id'
WHERE email = 'user@example.com';
```

### Issue: Super admin can't see all organizations

**Check:**
```sql
-- Verify super admin flag
SELECT id, email, is_super_admin
FROM users
WHERE email = 'superadmin@example.com';

-- If FALSE, make super admin
UPDATE users
SET is_super_admin = TRUE
WHERE email = 'superadmin@example.com';
```

### Issue: Organization appears inactive

**Fix:**
```sql
-- Reactivate organization
UPDATE organizations
SET is_active = TRUE,
    updated_at = NOW()
WHERE name = 'Organization Name';
```

## Next Steps

1. ✅ Run migration (Step 1)
2. ✅ Make yourself super admin (Step 2)
3. ✅ Test creating an organization (Step 3)
4. ✅ Create test users for that organization
5. ✅ Verify data isolation (log in as different org users)
6. 🔄 Build UI component for organization management
7. 🔄 Add audit logging for super admin actions
8. 🔄 Add email notifications for new organizations
9. 🔄 Add billing/usage tracking per organization

## Reference Links

- **Live App:** https://minrisk-starter.onrender.com
- **Supabase Dashboard:** https://supabase.com/dashboard/project/cnywkjfkhnwptceluvzs
- **Render Dashboard:** https://dashboard.render.com
- **GitHub Repo:** https://github.com/aonawunmi/minrisk-starter

## Support

For questions or issues:
1. Check TODO.md for deployment info
2. Review this SUPER_ADMIN_SETUP.md guide
3. Check Supabase logs for database errors
4. Check Render logs for deployment issues
