-- ============================================================================
-- Seed a diversified demo portfolio of assets
-- Demo User ID: 4960b4c0-3eb5-4df1-905e-efc6b7152dea
--
-- Showcases all three market-data integrations the API uses:
--   * Finnhub        -> live stock/ETF quotes (by Ticker, returned in USD)
--   * Gold-API       -> live gold price (AssetClass 'metal' / Ticker XAU, by Unit)
--   * exchangerate.host -> FX conversion when the display currency isn't USD
--
-- Matches the API's storage conventions (see AssetsController):
--   AssetClass lowercase, Ticker UPPERCASE, Unit lowercase.
--
-- IDEMPOTENT: each asset is inserted only if the user has no asset with that
-- name yet, so it is safe to re-run.
--
-- NOTE: CostBasisTotal is interpreted in the user's *display* currency when ROI
-- is computed. These cost bases are sized for a USD display; if the demo account
-- displays CAD/EUR the ROI % will still render, just against a USD-scaled basis.
-- ============================================================================

INSERT INTO "Assets"
    ("Id","UserId","Name","AssetClass","Ticker","Quantity","Unit",
     "CostBasisTotal","PurchaseDate","Notes","CreatedAt","UpdatedAt")
SELECT
    gen_random_uuid(),
    '4960b4c0-3eb5-4df1-905e-efc6b7152dea'::uuid,
    a.name, a.cls, a.ticker, a.qty, a.unit, a.cost,
    a.pdate::timestamp, a.notes, NOW(), NOW()
FROM (VALUES
    -- name                       class    ticker  qty    unit      cost_basis  purchase_date  notes
    ('Apple Inc.',                'stock', 'AAPL',  25,    'shares',  4500.00,   '2026-02-12',  'Core holding'),
    ('Microsoft Corp.',           'stock', 'MSFT',  12,    'shares',  4200.00,   '2026-02-20',  'Long-term tech position'),
    ('NVIDIA Corp.',              'stock', 'NVDA',  30,    'shares',  2800.00,   '2026-03-05',  'AI / semiconductors'),
    ('Alphabet Inc. (Class A)',   'stock', 'GOOGL', 15,    'shares',  2400.00,   '2026-03-18',  'Search & cloud'),
    ('Amazon.com Inc.',           'stock', 'AMZN',  14,    'shares',  2200.00,   '2026-04-02',  'E-commerce & AWS'),
    ('Tesla Inc.',                'stock', 'TSLA',  10,    'shares',  2300.00,   '2026-04-22',  'Speculative growth'),
    ('Vanguard S&P 500 ETF',      'stock', 'VOO',   8,     'shares',  3600.00,   '2026-05-08',  'Broad-market index ETF'),
    ('Physical Gold',             'metal', 'XAU',   5,     'oz',      11000.00,  '2026-05-15',  'Inflation hedge - troy ounces')
) AS a(name, cls, ticker, qty, unit, cost, pdate, notes)
WHERE NOT EXISTS (
    SELECT 1 FROM "Assets" x
    WHERE x."UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea'::uuid
      AND LOWER(x."Name") = LOWER(a.name)
);

-- ---------------------------------------------------------------------------
-- Verification: list the demo user's seeded assets
-- ---------------------------------------------------------------------------
SELECT
    "Name",
    "AssetClass",
    "Ticker",
    "Quantity",
    "Unit",
    "CostBasisTotal",
    "PurchaseDate"::date AS purchased
FROM "Assets"
WHERE "UserId" = '4960b4c0-3eb5-4df1-905e-efc6b7152dea'
ORDER BY "AssetClass", "Name";
