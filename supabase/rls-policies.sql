-- Row Level Security (RLS) Policies for Finance Tracker
-- This script enables RLS and creates policies for per-user data isolation
-- 
-- IMPORTANT: Run this AFTER the AddUserIdForMultiTenancy migration has been applied
-- and AFTER the demo user backfill script has been run

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE "Accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountSnapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transactions" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (if any)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own accounts" ON "Accounts";
DROP POLICY IF EXISTS "Users can insert their own accounts" ON "Accounts";
DROP POLICY IF EXISTS "Users can update their own accounts" ON "Accounts";
DROP POLICY IF EXISTS "Users can delete their own accounts" ON "Accounts";

DROP POLICY IF EXISTS "Users can view their own account snapshots" ON "AccountSnapshots";
DROP POLICY IF EXISTS "Users can insert their own account snapshots" ON "AccountSnapshots";
DROP POLICY IF EXISTS "Users can update their own account snapshots" ON "AccountSnapshots";
DROP POLICY IF EXISTS "Users can delete their own account snapshots" ON "AccountSnapshots";

DROP POLICY IF EXISTS "Users can view their own assets" ON "Assets";
DROP POLICY IF EXISTS "Users can insert their own assets" ON "Assets";
DROP POLICY IF EXISTS "Users can update their own assets" ON "Assets";
DROP POLICY IF EXISTS "Users can delete their own assets" ON "Assets";

DROP POLICY IF EXISTS "Users can view their own categories" ON "Categories";
DROP POLICY IF EXISTS "Users can insert their own categories" ON "Categories";
DROP POLICY IF EXISTS "Users can update their own categories" ON "Categories";
DROP POLICY IF EXISTS "Users can delete their own categories" ON "Categories";

DROP POLICY IF EXISTS "Users can view their own transactions" ON "Transactions";
DROP POLICY IF EXISTS "Users can insert their own transactions" ON "Transactions";
DROP POLICY IF EXISTS "Users can update their own transactions" ON "Transactions";
DROP POLICY IF EXISTS "Users can delete their own transactions" ON "Transactions";

-- ============================================================================
-- ACCOUNTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own accounts"
ON "Accounts"
FOR SELECT
TO authenticated
USING (auth.uid() = "UserId");

CREATE POLICY "Users can insert their own accounts"
ON "Accounts"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "UserId");

CREATE POLICY "Users can update their own accounts"
ON "Accounts"
FOR UPDATE
TO authenticated
USING (auth.uid() = "UserId")
WITH CHECK (auth.uid() = "UserId");

CREATE POLICY "Users can delete their own accounts"
ON "Accounts"
FOR DELETE
TO authenticated
USING (auth.uid() = "UserId");

-- ============================================================================
-- ACCOUNT SNAPSHOTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own account snapshots"
ON "AccountSnapshots"
FOR SELECT
TO authenticated
USING (auth.uid() = "UserId");

CREATE POLICY "Users can insert their own account snapshots"
ON "AccountSnapshots"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "UserId");

CREATE POLICY "Users can update their own account snapshots"
ON "AccountSnapshots"
FOR UPDATE
TO authenticated
USING (auth.uid() = "UserId")
WITH CHECK (auth.uid() = "UserId");

CREATE POLICY "Users can delete their own account snapshots"
ON "AccountSnapshots"
FOR DELETE
TO authenticated
USING (auth.uid() = "UserId");

-- ============================================================================
-- ASSETS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own assets"
ON "Assets"
FOR SELECT
TO authenticated
USING (auth.uid() = "UserId");

CREATE POLICY "Users can insert their own assets"
ON "Assets"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "UserId");

CREATE POLICY "Users can update their own assets"
ON "Assets"
FOR UPDATE
TO authenticated
USING (auth.uid() = "UserId")
WITH CHECK (auth.uid() = "UserId");

CREATE POLICY "Users can delete their own assets"
ON "Assets"
FOR DELETE
TO authenticated
USING (auth.uid() = "UserId");

-- ============================================================================
-- CATEGORIES POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own categories"
ON "Categories"
FOR SELECT
TO authenticated
USING (auth.uid() = "UserId");

CREATE POLICY "Users can insert their own categories"
ON "Categories"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "UserId");

CREATE POLICY "Users can update their own categories"
ON "Categories"
FOR UPDATE
TO authenticated
USING (auth.uid() = "UserId")
WITH CHECK (auth.uid() = "UserId");

CREATE POLICY "Users can delete their own categories"
ON "Categories"
FOR DELETE
TO authenticated
USING (auth.uid() = "UserId");

-- ============================================================================
-- TRANSACTIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own transactions"
ON "Transactions"
FOR SELECT
TO authenticated
USING (auth.uid() = "UserId");

CREATE POLICY "Users can insert their own transactions"
ON "Transactions"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "UserId");

CREATE POLICY "Users can update their own transactions"
ON "Transactions"
FOR UPDATE
TO authenticated
USING (auth.uid() = "UserId")
WITH CHECK (auth.uid() = "UserId");

CREATE POLICY "Users can delete their own transactions"
ON "Transactions"
FOR DELETE
TO authenticated
USING (auth.uid() = "UserId");

-- ============================================================================
-- VERIFY RLS IS ENABLED
-- ============================================================================

SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN 'ENABLED ?' 
        ELSE 'DISABLED ?' 
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('Accounts', 'AccountSnapshots', 'Assets', 'Categories', 'Transactions')
ORDER BY tablename;

-- ============================================================================
-- VIEW ALL POLICIES
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('Accounts', 'AccountSnapshots', 'Assets', 'Categories', 'Transactions')
ORDER BY tablename, cmd;
