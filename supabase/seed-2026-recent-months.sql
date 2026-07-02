-- ============================================================================
-- Seed recent months of demo data: Feb 2026 -> Jun 2026 (current month partial)
-- Demo User ID: 4960b4c0-3eb5-4df1-905e-efc6b7152dea
--
-- Safe to run on the live Supabase database (SQL Editor or psql).
-- It is IDEMPOTENT:
--   * Categories are created only if missing (and given an income/expense Type).
--   * A month's transactions are skipped if that month already has any.
--   * Account snapshots use ON CONFLICT (AccountId, Date) DO NOTHING.
-- The "current month" (June 2026) is only filled up to the run cap (2026-06-29).
-- ============================================================================

DO $$
DECLARE
    demo        UUID  := '4960b4c0-3eb5-4df1-905e-efc6b7152dea';
    today       DATE  := '2026-06-29';                 -- current date / cap for the live month
    months      DATE[] := ARRAY['2026-02-01','2026-03-01','2026-04-01',
                                 '2026-05-01','2026-06-01']::date[];
    m           DATE;
    month_end   DATE;
    cap         DATE;        -- do not insert transactions dated after this
    idx         INT  := 0;   -- month counter, used for natural month-to-month variance
    v           NUMERIC;     -- per-month variance multiplier (~0.9 .. 1.1)

    cat_income  INT;
    cat_rent    INT;
    cat_groc    INT;
    cat_trans   INT;
    cat_dining  INT;
    cat_enter   INT;
    cat_util    INT;
    cat_shop    INT;
    cat_health  INT;

    acct        RECORD;
    base_bal    NUMERIC;
    bal         NUMERIC;
    snap_date   DATE;
BEGIN
    -- ------------------------------------------------------------------
    -- 1. Ensure categories exist with the correct income/expense Type
    -- ------------------------------------------------------------------
    INSERT INTO "Categories" ("UserId", "Name", "Type")
    SELECT demo, c.name, c.type
    FROM (VALUES
        ('Income',         'income'),
        ('Rent',           'expense'),
        ('Groceries',      'expense'),
        ('Transportation', 'expense'),
        ('Dining Out',     'expense'),
        ('Entertainment',  'expense'),
        ('Utilities',      'expense'),
        ('Shopping',       'expense'),
        ('Healthcare',     'expense')
    ) AS c(name, type)
    WHERE NOT EXISTS (
        SELECT 1 FROM "Categories" x
        WHERE x."UserId" = demo AND LOWER(x."Name") = LOWER(c.name)
    );

    -- Backfill Type on any pre-existing rows that are missing it
    UPDATE "Categories" SET "Type" = 'income'
        WHERE "UserId" = demo AND LOWER("Name") = 'income' AND "Type" IS NULL;
    UPDATE "Categories" SET "Type" = 'expense'
        WHERE "UserId" = demo
          AND LOWER("Name") IN ('rent','groceries','transportation','dining out',
                                 'entertainment','utilities','shopping','healthcare')
          AND "Type" IS NULL;

    -- Resolve category IDs by name
    SELECT "Id" INTO cat_income FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='income';
    SELECT "Id" INTO cat_rent   FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='rent';
    SELECT "Id" INTO cat_groc   FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='groceries';
    SELECT "Id" INTO cat_trans  FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='transportation';
    SELECT "Id" INTO cat_dining FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='dining out';
    SELECT "Id" INTO cat_enter  FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='entertainment';
    SELECT "Id" INTO cat_util   FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='utilities';
    SELECT "Id" INTO cat_shop   FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='shopping';
    SELECT "Id" INTO cat_health FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='healthcare';

    -- ------------------------------------------------------------------
    -- 2. Transactions, one month at a time
    -- ------------------------------------------------------------------
    FOREACH m IN ARRAY months LOOP
        idx       := idx + 1;
        month_end := (m + INTERVAL '1 month')::date - 1;
        cap       := LEAST(month_end, today);
        -- gentle month-to-month swing so totals are not identical every month
        v         := 0.90 + ((idx * 7) % 5) * 0.05;   -- 0.90, 1.05, 0.95, 1.10, 1.00 ...

        -- Skip months that already contain transactions (idempotency guard)
        CONTINUE WHEN EXISTS (
            SELECT 1 FROM "Transactions"
            WHERE "UserId" = demo AND "Date" BETWEEN m AND month_end
        );

        -- Income: monthly salary on the 1st, occasional freelance every other month
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, t.amt, m + (t.d - 1), t.cat, t.descr
        FROM (VALUES
            (1,  3500.00, cat_income, 'Monthly Salary'),
            (16, CASE WHEN idx % 2 = 0 THEN 620.00 ELSE 0 END, cat_income, 'Freelance Project Payment')
        ) AS t(d, amt, cat, descr)
        WHERE t.amt <> 0 AND (m + (t.d - 1)) <= cap;

        -- Rent on the 1st
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, -1500.00, m, cat_rent, 'Monthly Rent'
        WHERE m <= cap;

        -- Groceries
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, ROUND(t.amt * v, 2), m + (t.d - 1), cat_groc, t.descr
        FROM (VALUES
            (3,  -89.50,  'Whole Foods - Weekly groceries'),
            (10, -124.30, 'Costco - Bulk shopping'),
            (17, -67.80,  'Trader Joes - Fresh produce'),
            (24, -95.20,  'Safeway - Weekly groceries')
        ) AS t(d, amt, descr)
        WHERE (m + (t.d - 1)) <= cap;

        -- Transportation
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, ROUND(t.amt * v, 2), m + (t.d - 1), cat_trans, t.descr
        FROM (VALUES
            (5,  -62.00, 'Gas station fill-up'),
            (8,  -12.50, 'Transit pass top-up'),
            (19, -58.00, 'Gas station fill-up'),
            (27, -28.00, 'Parking downtown')
        ) AS t(d, amt, descr)
        WHERE (m + (t.d - 1)) <= cap;

        -- Dining Out
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, ROUND(t.amt * v, 2), m + (t.d - 1), cat_dining, t.descr
        FROM (VALUES
            (4,  -45.80, 'Italian restaurant - Dinner'),
            (11, -67.90, 'Steakhouse - Date night'),
            (20, -32.40, 'Thai restaurant - Lunch'),
            (28, -41.20, 'Mexican restaurant - Dinner')
        ) AS t(d, amt, descr)
        WHERE (m + (t.d - 1)) <= cap;

        -- Entertainment (recurring subscriptions + an outing)
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, t.amt, m + (t.d - 1), cat_enter, t.descr
        FROM (VALUES
            (2,  -15.99, 'Netflix subscription'),
            (12, ROUND(-32.00 * v, 2), 'Movie & dinner night'),
            (18, -14.99, 'Spotify subscription')
        ) AS t(d, amt, descr)
        WHERE (m + (t.d - 1)) <= cap;

        -- Utilities (natural gas only in colder months Feb/Mar)
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, ROUND(t.amt * v, 2), m + (t.d - 1), cat_util, t.descr
        FROM (VALUES
            (5,  -85.00, 'Electric bill'),
            (10, -65.00, 'Internet bill'),
            (15, -45.00, 'Water bill'),
            (20, CASE WHEN idx <= 2 THEN -110.00 ELSE 0 END, 'Natural gas bill')
        ) AS t(d, amt, descr)
        WHERE t.amt <> 0 AND (m + (t.d - 1)) <= cap;

        -- Shopping
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, ROUND(t.amt * v, 2), m + (t.d - 1), cat_shop, t.descr
        FROM (VALUES
            (9,  -89.99,  'Amazon - Household & electronics'),
            (23, -67.80,  'Clothing store - Seasonal refresh')
        ) AS t(d, amt, descr)
        WHERE (m + (t.d - 1)) <= cap;

        -- Healthcare (every other month)
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, t.amt, m + (t.d - 1), cat_health, t.descr
        FROM (VALUES
            (21, CASE WHEN idx % 2 = 1 THEN -35.00 ELSE -150.00 END, 'Pharmacy / clinic visit')
        ) AS t(d, amt, descr)
        WHERE (m + (t.d - 1)) <= cap;

    END LOOP;

    -- ------------------------------------------------------------------
    -- 3. Monthly account snapshots for net-worth history
    --    (only for accounts that already exist; nothing happens otherwise)
    -- ------------------------------------------------------------------
    FOR acct IN
        SELECT "Id", "Type", "IsLiability" FROM "Accounts" WHERE "UserId" = demo
    LOOP
        -- pick a sensible starting balance by account type
        base_bal := CASE
            WHEN acct."IsLiability" THEN -2400.00
            WHEN LOWER(COALESCE(acct."Type",'')) IN ('investment','brokerage') THEN 21000.00
            WHEN LOWER(COALESCE(acct."Type",'')) IN ('cash') THEN 1200.00
            ELSE 5400.00   -- bank / chequing / default
        END;

        idx := 0;
        FOREACH m IN ARRAY months LOOP
            idx       := idx + 1;
            month_end := (m + INTERVAL '1 month')::date - 1;
            snap_date := LEAST(month_end, today);

            -- liabilities shrink ~2%/mo, assets grow ~2.5%/mo (compounding from base)
            IF acct."IsLiability" THEN
                bal := ROUND((base_bal * POWER(0.98, idx - 1))::numeric, 2);
            ELSE
                bal := ROUND((base_bal * POWER(1.025, idx - 1))::numeric, 2);
            END IF;

            INSERT INTO "AccountSnapshots" ("Id","UserId","AccountId","Date","Balance","CreatedAt")
            VALUES (gen_random_uuid(), demo, acct."Id", snap_date, bal, NOW())
            ON CONFLICT ("AccountId","Date") DO NOTHING;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Seed complete for Feb-Jun 2026 (current month capped at %).', today;
END $$;

-- ---------------------------------------------------------------------------
-- Verification: monthly income / expense / net for the demo user
-- ---------------------------------------------------------------------------
SELECT
    TO_CHAR("Date", 'YYYY-MM')                                AS month,
    SUM("Amount") FILTER (WHERE "Amount" > 0)                 AS income,
    SUM("Amount") FILTER (WHERE "Amount" < 0)                 AS expenses,
    SUM("Amount")                                             AS net,
    COUNT(*)                                                  AS txns
FROM "Transactions"
WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea'
  AND "Date" >= '2026-02-01' AND "Date" < '2026-07-01'
GROUP BY 1
ORDER BY 1;
