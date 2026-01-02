-- Verify and fix category IDs for demo account transactions

-- Step 1: Check what categories exist for demo user
SELECT "Id", "Name" 
FROM "Categories" 
WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea'
ORDER BY "Name";

-- Step 2: Check if transactions were inserted (they might have foreign key violations)
SELECT COUNT(*) 
FROM "Transactions" 
WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea'
  AND "Date" >= '2025-01-01' 
  AND "Date" < '2025-02-01';

-- Step 3: If count is 0, the issue is category IDs don't exist
-- Create the categories first:
INSERT INTO "Categories" ("UserId", "Name")
VALUES 
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', 'Groceries'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', 'Transportation'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', 'Entertainment'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', 'Utilities'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', 'Income'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', 'Dining Out'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', 'Shopping'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', 'Healthcare')
ON CONFLICT DO NOTHING;

-- Step 4: Get the actual category IDs
SELECT "Id", "Name" 
FROM "Categories" 
WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea'
ORDER BY "Name";

-- Step 5: Use the output from Step 4 to update the transaction seed script
-- Replace the hardcoded IDs (1-8) with the actual IDs from your database
