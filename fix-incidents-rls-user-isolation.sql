-- Fix Incidents RLS: User Isolation
-- Users can only see their own incidents; Admins can see all incidents in their org
--
-- Run this in Supabase SQL Editor

-- =====================================================
-- DROP EXISTING INCIDENTS SELECT POLICY
-- =====================================================

DROP POLICY IF EXISTS "Users can view incidents in their organization" ON incidents;

-- =====================================================
-- CREATE NEW SELECT POLICY WITH USER ISOLATION
-- =====================================================

-- Regular users can only see THEIR OWN incidents
-- Admins can see ALL incidents in their organization
CREATE POLICY "Users can view own incidents; Admins see all"
    ON incidents FOR SELECT
    USING (
        -- Check if user is in same organization
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        AND (
            -- Either: User created this incident (regular user)
            user_id = auth.uid()
            OR
            -- OR: User is an Admin (can see all incidents in org)
            EXISTS (
                SELECT 1 FROM user_profiles
                WHERE id = auth.uid()
                AND role = 'Admin'
            )
        )
    );

-- =====================================================
-- UPDATE INSERT POLICY (ensure user_id is set)
-- =====================================================

-- Drop and recreate INSERT policy to ensure user_id is always set to auth.uid()
DROP POLICY IF EXISTS "Users can create incidents in their organization" ON incidents;

CREATE POLICY "Users can create incidents in their organization"
    ON incidents FOR INSERT
    WITH CHECK (
        -- Must be in same organization
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        AND
        -- Ensure user_id matches authenticated user
        user_id = auth.uid()
    );

-- =====================================================
-- UPDATE UPDATE POLICY (users can only update their own)
-- =====================================================

DROP POLICY IF EXISTS "Users can update their own incidents or admins can update any" ON incidents;

CREATE POLICY "Users update own incidents; Admins update all"
    ON incidents FOR UPDATE
    USING (
        -- Must be in same organization
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        AND (
            -- Either: User owns this incident
            user_id = auth.uid()
            OR
            -- OR: User is an Admin
            EXISTS (
                SELECT 1 FROM user_profiles
                WHERE id = auth.uid()
                AND role = 'Admin'
            )
        )
    )
    WITH CHECK (
        -- Ensure organization stays the same
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- =====================================================
-- VERIFY POLICIES
-- =====================================================

-- Check that policies are created correctly
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'incidents'
ORDER BY policyname;

-- =====================================================
-- NOTES
-- =====================================================

-- SECURITY MODEL:
-- 1. Regular Users (role != 'Admin'):
--    - Can only CREATE incidents for themselves
--    - Can only VIEW their own incidents
--    - Can only UPDATE their own incidents
--    - Cannot DELETE incidents

-- 2. Admin Users (role = 'Admin'):
--    - Can VIEW all incidents in their organization
--    - Can UPDATE all incidents in their organization
--    - Can DELETE incidents in their organization
--    - This follows existing admin pattern from risks table

-- TEST SCENARIOS:
-- 1. User A creates incident → User A can see it, User B cannot
-- 2. User A creates incident → Admin can see it
-- 3. User A tries to view User B's incident → Denied
-- 4. Admin views all incidents → Should see User A's and User B's incidents
-- 5. User A tries to update User B's incident → Denied
-- 6. Admin updates any incident → Allowed

-- DEPLOYMENT:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify policies with SELECT query above
-- 3. Test with regular user account (should only see own incidents)
-- 4. Test with admin account (should see all incidents in org)
-- 5. No frontend code changes needed - RLS is enforced at database level
