-- Fix Incidents RLS: User Isolation (Version 2 - Force Replace)
-- Users can only see their own incidents; Admins can see all incidents in their org
--
-- Run this in Supabase SQL Editor

-- =====================================================
-- DROP ALL EXISTING INCIDENTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own incidents; Admins see all" ON incidents;
DROP POLICY IF EXISTS "Users can view incidents in their organization" ON incidents;
DROP POLICY IF EXISTS "Users can create incidents in their organization" ON incidents;
DROP POLICY IF EXISTS "Users can update their own incidents or admins can update any" ON incidents;
DROP POLICY IF EXISTS "Users update own incidents; Admins update all" ON incidents;

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
                AND role = 'admin'
            )
        )
    );

-- =====================================================
-- CREATE INSERT POLICY (ensure user_id is set)
-- =====================================================

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
-- CREATE UPDATE POLICY (users can only update their own)
-- =====================================================

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
                AND role = 'admin'
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
