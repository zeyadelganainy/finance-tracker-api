-- Backfill script for demo user ownership
-- This script assigns all existing data to the demo user account
-- Run this BEFORE applying the NOT NULL constraints in the EF migration

-- ?? IMPORTANT: Replace 'YOUR-DEMO-USER-UUID-HERE' with the actual Supabase auth.uid() of your demo account
-- You can get this from Supabase Dashboard > Authentication > Users > select demo user > copy UID

DO $$
DECLARE
    demo_user_id UUID := 'YOUR-DEMO-USER-UUID-HERE'::uuid; -- ?? REPLACE THIS
BEGIN
    -- Validate that demo_user_id is set
    IF demo_user_id = 'YOUR-DEMO-USER-UUID-HERE'::uuid THEN
        RAISE EXCEPTION 'Please set the demo_user_id variable to your actual demo user UUID';
    END IF;

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
