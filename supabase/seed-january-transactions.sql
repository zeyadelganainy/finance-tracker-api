-- Seed January 2025 transactions for demo account
-- Demo User ID: 4960b4c0-3eb5-4df1-905e-efc6b7152dea

-- Categories needed (verify these exist or adjust IDs)
-- Assume these category IDs exist for the demo user:
-- 1 = Groceries
-- 2 = Transportation
-- 3 = Entertainment
-- 4 = Utilities
-- 5 = Income
-- 6 = Dining Out
-- 7 = Shopping
-- 8 = Healthcare

-- Income transactions
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
VALUES 
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', 3500.00, '2025-01-01', 5, 'Monthly Salary'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', 500.00, '2025-01-15', 5, 'Freelance Project Payment');

-- Groceries
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
VALUES 
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -89.50, '2025-01-03', 1, 'Whole Foods - Weekly groceries'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -124.30, '2025-01-10', 1, 'Costco - Bulk shopping'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -67.80, '2025-01-17', 1, 'Trader Joes - Fresh produce'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -95.20, '2025-01-24', 1, 'Safeway - Weekly groceries'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -45.60, '2025-01-29', 1, 'Local market - Fresh items');

-- Transportation
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
VALUES 
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -65.00, '2025-01-05', 2, 'Gas station fill-up'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -12.50, '2025-01-08', 2, 'Uber to airport'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -58.00, '2025-01-14', 2, 'Gas station fill-up'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -25.00, '2025-01-22', 2, 'Parking downtown'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -62.00, '2025-01-27', 2, 'Gas station fill-up');

-- Dining Out
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
VALUES 
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -45.80, '2025-01-04', 6, 'Italian restaurant - Dinner'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -28.50, '2025-01-06', 6, 'Coffee shop - Breakfast'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -67.90, '2025-01-11', 6, 'Steakhouse - Date night'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -32.40, '2025-01-16', 6, 'Thai restaurant - Lunch'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -52.30, '2025-01-20', 6, 'Sushi restaurant - Dinner'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -19.75, '2025-01-25', 6, 'Fast food - Quick lunch'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -41.20, '2025-01-28', 6, 'Mexican restaurant - Dinner');

-- Entertainment
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
VALUES 
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -15.99, '2025-01-02', 3, 'Netflix subscription'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -24.50, '2025-01-07', 3, 'Movie tickets'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -39.99, '2025-01-12', 3, 'Concert tickets'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -14.99, '2025-01-18', 3, 'Spotify subscription'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -32.00, '2025-01-26', 3, 'Bowling night');

-- Utilities
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
VALUES 
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -85.00, '2025-01-05', 4, 'Electric bill'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -65.00, '2025-01-10', 4, 'Internet bill'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -45.00, '2025-01-15', 4, 'Water bill'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -120.00, '2025-01-20', 4, 'Natural gas bill');

-- Shopping
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
VALUES 
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -89.99, '2025-01-09', 7, 'Amazon - Electronics'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -45.00, '2025-01-13', 7, 'Target - Household items'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -125.50, '2025-01-19', 7, 'Best Buy - New headphones'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -67.80, '2025-01-23', 7, 'Clothing store - Winter jacket');

-- Healthcare
INSERT INTO "Transactions" ("UserId", "Amount", "Date", "CategoryId", "Description")
VALUES 
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -35.00, '2025-01-08', 8, 'Pharmacy - Prescriptions'),
    ('4960b4c0-3eb5-4df1-905e-efc6b7152dea', -150.00, '2025-01-21', 8, 'Dentist appointment');

-- Summary for January 2025:
-- Total Income: $4,000.00
-- Total Expenses: -$2,187.05
-- Net: $1,812.95
-- Transactions: 38 total
