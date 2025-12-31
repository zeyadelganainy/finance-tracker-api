-- Backfill script for demo user ownership
-- This script assigns all existing data to the demo user account
-- Run this BEFORE applying the NOT NULL constraints in the EF migration

-- Demo user UUID: 4960b4c0-3eb5-4df1-905e-efc6b7152dea

DO $$
DECLARE
    demo_user_id UUID := '4960b4c0-3eb5-4df1-905e-efc6b7152dea'::uuid;
BEGIN
    -- Update Accounts
    UPDATE "Accounts"
    SET "UserId" = demo_user_id
    WHERE "UserId" IS NULL OR "UserId" = '00000000-0000-0000-0000-000000000000'::uuid;
    
    RAISE NOTICE 'Updated % accounts', FOUND;

    -- Update AccountSnapshots
    UPDATE "AccountSnapshots"
    SET "UserId" = demo_user_id
    WHERE "UserId" IS NULL OR "UserId" = '00000000-0000-0000-0000-000000000000'::uuid;
    
    RAISE NOTICE 'Updated % account snapshots', FOUND;

    -- Update Assets
    UPDATE "Assets"
    SET "UserId" = demo_user_id
    WHERE "UserId" IS NULL OR "UserId" = '00000000-0000-0000-0000-000000000000'::uuid;
    
    RAISE NOTICE 'Updated % assets', FOUND;

    -- Update Categories
    UPDATE "Categories"
    SET "UserId" = demo_user_id
    WHERE "UserId" IS NULL OR "UserId" = '00000000-0000-0000-0000-000000000000'::uuid;
    
    RAISE NOTICE 'Updated % categories', FOUND;

    -- Update Transactions
    UPDATE "Transactions"
    SET "UserId" = demo_user_id
    WHERE "UserId" IS NULL OR "UserId" = '00000000-0000-0000-0000-000000000000'::uuid;
    
    RAISE NOTICE 'Updated % transactions', FOUND;

    RAISE NOTICE 'Backfill complete! All existing data now belongs to demo user: %', demo_user_id;
END $$;

-- Verify the backfill worked
SELECT 
    'Accounts' as table_name, 
    COUNT(*) as total_rows,
    COUNT(DISTINCT "UserId") as unique_users
FROM "Accounts"
UNION ALL
SELECT 
    'AccountSnapshots', 
    COUNT(*), 
    COUNT(DISTINCT "UserId")
FROM "AccountSnapshots"
UNION ALL
SELECT 
    'Assets', 
    COUNT(*), 
    COUNT(DISTINCT "UserId")
FROM "Assets"
UNION ALL
SELECT 
    'Categories', 
    COUNT(*), 
    COUNT(DISTINCT "UserId")
FROM "Categories"
UNION ALL
SELECT 
    'Transactions', 
    COUNT(*), 
    COUNT(DISTINCT "UserId")
FROM "Transactions";
