-- Seed January 2025 transactions for demo account (fixed version)
-- Demo User ID: 4960b4c0-3eb5-4df1-905e-efc6b7152dea
-- This version uses category names instead of hardcoded IDs

-- First, ensure categories exist (will skip if they already exist)
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
ON CONFLICT ("UserId", LOWER("Name")) DO NOTHING;

-- Income transactions
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    3500.00,
    '2025-01-01'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'income'),
    'Monthly Salary'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    500.00,
    '2025-01-15'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'income'),
    'Freelance Project Payment';

-- Groceries
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -89.50,
    '2025-01-03'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'groceries'),
    'Whole Foods - Weekly groceries'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -124.30,
    '2025-01-10'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'groceries'),
    'Costco - Bulk shopping'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -67.80,
    '2025-01-17'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'groceries'),
    'Trader Joes - Fresh produce'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -95.20,
    '2025-01-24'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'groceries'),
    'Safeway - Weekly groceries'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -45.60,
    '2025-01-29'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'groceries'),
    'Local market - Fresh items';

-- Transportation
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -65.00,
    '2025-01-05'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'transportation'),
    'Gas station fill-up'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -12.50,
    '2025-01-08'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'transportation'),
    'Uber to airport'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -58.00,
    '2025-01-14'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'transportation'),
    'Gas station fill-up'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -25.00,
    '2025-01-22'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'transportation'),
    'Parking downtown'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -62.00,
    '2025-01-27'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'transportation'),
    'Gas station fill-up';

-- Dining Out
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -45.80,
    '2025-01-04'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'dining out'),
    'Italian restaurant - Dinner'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -28.50,
    '2025-01-06'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'dining out'),
    'Coffee shop - Breakfast'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -67.90,
    '2025-01-11'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'dining out'),
    'Steakhouse - Date night'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -32.40,
    '2025-01-16'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'dining out'),
    'Thai restaurant - Lunch'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -52.30,
    '2025-01-20'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'dining out'),
    'Sushi restaurant - Dinner'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -19.75,
    '2025-01-25'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'dining out'),
    'Fast food - Quick lunch'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -41.20,
    '2025-01-28'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'dining out'),
    'Mexican restaurant - Dinner';

-- Entertainment
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -15.99,
    '2025-01-02'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'entertainment'),
    'Netflix subscription'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -24.50,
    '2025-01-07'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'entertainment'),
    'Movie tickets'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -39.99,
    '2025-01-12'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'entertainment'),
    'Concert tickets'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -14.99,
    '2025-01-18'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'entertainment'),
    'Spotify subscription'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -32.00,
    '2025-01-26'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'entertainment'),
    'Bowling night';

-- Utilities
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -85.00,
    '2025-01-05'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'utilities'),
    'Electric bill'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -65.00,
    '2025-01-10'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'utilities'),
    'Internet bill'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -45.00,
    '2025-01-15'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'utilities'),
    'Water bill'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -120.00,
    '2025-01-20'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'utilities'),
    'Natural gas bill';

-- Shopping
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -89.99,
    '2025-01-09'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'shopping'),
    'Amazon - Electronics'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -45.00,
    '2025-01-13'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'shopping'),
    'Target - Household items'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -125.50,
    '2025-01-19'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'shopping'),
    'Best Buy - New headphones'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -67.80,
    '2025-01-23'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'shopping'),
    'Clothing store - Winter jacket';

-- Healthcare
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -35.00,
    '2025-01-08'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'healthcare'),
    'Pharmacy - Prescriptions'
UNION ALL SELECT 
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea',
    -150.00,
    '2025-01-21'::date,
    (SELECT "Id" FROM "Categories" WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea' AND LOWER("Name") = 'healthcare'),
    'Dentist appointment';

-- Summary for January 2025:
-- Total Income: $4,000.00
-- Total Expenses: -$2,187.05
-- Net: $1,812.95
-- Transactions: 38 total
