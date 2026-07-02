-- ============================================================================
-- Seed July 2026 demo data (transactions + a month-end account snapshot)
-- Demo User ID: 4960b4c0-3eb5-4df1-905e-efc6b7152dea
--
-- Companion to seed-2026-recent-months.sql (which covers Feb–Jun 2026).
-- IDEMPOTENT: categories created only if missing; July is skipped if it already
-- has any transactions; snapshots use ON CONFLICT (AccountId, Date) DO NOTHING.
--
-- By default this fills the WHOLE month of July so the demo looks active. If you
-- prefer not to have transactions dated after the real current date, lower `cap`
-- below to e.g. CURRENT_DATE.
-- ============================================================================

DO $$
DECLARE
    demo        UUID  := '4960b4c0-3eb5-4df1-905e-efc6b7152dea';
    m           DATE  := '2026-07-01';                 -- month being seeded
    month_end   DATE  := '2026-07-31';
    cap         DATE  := '2026-07-31';                 -- do not insert past this (set to CURRENT_DATE to avoid future rows)
    v           NUMERIC := 1.03;                       -- gentle variance vs. base amounts

    cat_income  INT; cat_rent INT; cat_groc INT; cat_trans INT; cat_dining INT;
    cat_enter   INT; cat_util INT; cat_shop INT; cat_health INT;

    acct        RECORD;
    base_bal    NUMERIC;
    bal         NUMERIC;
    snap_date   DATE;
BEGIN
    -- 1. Ensure categories exist with correct income/expense Type
    INSERT INTO "Categories" ("UserId", "Name", "Type")
    SELECT demo, c.name, c.type
    FROM (VALUES
        ('Income','income'), ('Rent','expense'), ('Groceries','expense'),
        ('Transportation','expense'), ('Dining Out','expense'), ('Entertainment','expense'),
        ('Utilities','expense'), ('Shopping','expense'), ('Healthcare','expense')
    ) AS c(name, type)
    WHERE NOT EXISTS (
        SELECT 1 FROM "Categories" x
        WHERE x."UserId" = demo AND LOWER(x."Name") = LOWER(c.name)
    );

    SELECT "Id" INTO cat_income FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='income';
    SELECT "Id" INTO cat_rent   FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='rent';
    SELECT "Id" INTO cat_groc   FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='groceries';
    SELECT "Id" INTO cat_trans  FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='transportation';
    SELECT "Id" INTO cat_dining FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='dining out';
    SELECT "Id" INTO cat_enter  FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='entertainment';
    SELECT "Id" INTO cat_util   FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='utilities';
    SELECT "Id" INTO cat_shop   FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='shopping';
    SELECT "Id" INTO cat_health FROM "Categories" WHERE "UserId"=demo AND LOWER("Name")='healthcare';

    -- 2. Skip if July already has transactions (idempotency guard)
    IF EXISTS (
        SELECT 1 FROM "Transactions"
        WHERE "UserId" = demo AND "Date" BETWEEN m AND month_end
    ) THEN
        RAISE NOTICE 'July 2026 already has transactions; skipping insert.';
    ELSE
        -- Income: salary on the 1st, freelance mid-month
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, t.amt, m + (t.d - 1), cat_income, t.descr
        FROM (VALUES
            (1,  3500.00, 'Monthly Salary'),
            (16, 720.00,  'Freelance Project Payment')
        ) AS t(d, amt, descr)
        WHERE (m + (t.d - 1)) <= cap;

        -- Rent
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, -1500.00, m, cat_rent, 'Monthly Rent' WHERE m <= cap;

        -- Groceries
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, ROUND(t.amt * v, 2), m + (t.d - 1), cat_groc, t.descr
        FROM (VALUES
            (3,  -92.40,  'Whole Foods - Weekly groceries'),
            (10, -118.65, 'Costco - Bulk shopping'),
            (17, -71.30,  'Trader Joes - Fresh produce'),
            (24, -88.90,  'Safeway - Weekly groceries')
        ) AS t(d, amt, descr)
        WHERE (m + (t.d - 1)) <= cap;

        -- Transportation
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, ROUND(t.amt * v, 2), m + (t.d - 1), cat_trans, t.descr
        FROM (VALUES
            (5,  -64.00, 'Gas station fill-up'),
            (8,  -12.50, 'Transit pass top-up'),
            (19, -59.00, 'Gas station fill-up'),
            (27, -30.00, 'Parking downtown')
        ) AS t(d, amt, descr)
        WHERE (m + (t.d - 1)) <= cap;

        -- Dining Out
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, ROUND(t.amt * v, 2), m + (t.d - 1), cat_dining, t.descr
        FROM (VALUES
            (4,  -48.20, 'Rooftop patio - Summer dinner'),
            (11, -63.50, 'Steakhouse - Date night'),
            (20, -34.10, 'Thai restaurant - Lunch'),
            (28, -44.75, 'Mexican restaurant - Dinner')
        ) AS t(d, amt, descr)
        WHERE (m + (t.d - 1)) <= cap;

        -- Entertainment (recurring subscriptions + an outing)
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, t.amt, m + (t.d - 1), cat_enter, t.descr
        FROM (VALUES
            (2,  -15.99, 'Netflix subscription'),
            (12, -36.00, 'Concert tickets'),
            (18, -14.99, 'Spotify subscription')
        ) AS t(d, amt, descr)
        WHERE (m + (t.d - 1)) <= cap;

        -- Utilities (no natural gas in summer)
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, ROUND(t.amt * v, 2), m + (t.d - 1), cat_util, t.descr
        FROM (VALUES
            (5,  -96.00, 'Electric bill (A/C season)'),
            (10, -65.00, 'Internet bill'),
            (15, -45.00, 'Water bill')
        ) AS t(d, amt, descr)
        WHERE (m + (t.d - 1)) <= cap;

        -- Shopping
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, ROUND(t.amt * v, 2), m + (t.d - 1), cat_shop, t.descr
        FROM (VALUES
            (9,  -84.99, 'Amazon - Household & electronics'),
            (23, -72.40, 'Summer clothing refresh')
        ) AS t(d, amt, descr)
        WHERE (m + (t.d - 1)) <= cap;

        -- Healthcare
        INSERT INTO "Transactions" ("UserId","Amount","Date","CategoryId","Description")
        SELECT demo, -35.00, m + 20, cat_health, 'Pharmacy - Prescriptions'
        WHERE (m + 20) <= cap;

        RAISE NOTICE 'Inserted July 2026 transactions (through %).', cap;
    END IF;

    -- 3. Month-end snapshot per existing account (continues net-worth history;
    --    idx 6 = the 6th month after the Feb baseline used in the recent-months seed)
    FOR acct IN SELECT "Id", "Type", "IsLiability" FROM "Accounts" WHERE "UserId" = demo LOOP
        base_bal := CASE
            WHEN acct."IsLiability" THEN -2400.00
            WHEN LOWER(COALESCE(acct."Type",'')) IN ('investment','brokerage') THEN 21000.00
            WHEN LOWER(COALESCE(acct."Type",'')) IN ('cash') THEN 1200.00
            ELSE 5400.00
        END;

        IF acct."IsLiability" THEN
            bal := ROUND((base_bal * POWER(0.98, 5))::numeric, 2);
        ELSE
            bal := ROUND((base_bal * POWER(1.025, 5))::numeric, 2);
        END IF;

        snap_date := LEAST(month_end, cap);
        INSERT INTO "AccountSnapshots" ("Id","UserId","AccountId","Date","Balance","CreatedAt")
        VALUES (gen_random_uuid(), demo, acct."Id", snap_date, bal, NOW())
        ON CONFLICT ("AccountId","Date") DO NOTHING;
    END LOOP;

    RAISE NOTICE 'July 2026 seed complete.';
END $$;

-- Verification: July income / expense / net for the demo user
SELECT
    TO_CHAR("Date", 'YYYY-MM')                    AS month,
    SUM("Amount") FILTER (WHERE "Amount" > 0)     AS income,
    SUM("Amount") FILTER (WHERE "Amount" < 0)     AS expenses,
    SUM("Amount")                                 AS net,
    COUNT(*)                                      AS txns
FROM "Transactions"
WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea'
  AND "Date" >= '2026-07-01' AND "Date" < '2026-08-01'
GROUP BY 1;
