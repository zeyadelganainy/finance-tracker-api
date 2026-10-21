# WealthWise

A personal finance tracker for income, expenses, accounts, assets, ROI and net worth.
**Live:** https://wealthwise-sable.vercel.app (use **Continue as Demo** on the sign-in page to explore a pre-seeded account).

## The problem

Most budgeting apps track spending but not what you own. WealthWise keeps transactions, account
balances and investments (stocks, ETFs, gold) in one place, values them at live market prices in
your chosen currency, and rolls everything up into a net-worth history.

## Key design decisions

- **The API owns the data rules, not the client.** Every query is scoped to the user ID taken from a
  verified JWT, so one user can never read or change another user's rows. Supabase row-level
  security policies (`supabase/rls-policies.sql`) add a second layer in the database, and
  `MultiUserIsolationTests` checks the isolation through the real HTTP pipeline.
- **Auth is delegated, verification is not.** Sign-in is handled by Supabase Auth, but the .NET API
  validates every token itself against Supabase's JWKS endpoint (issuer, audience and signing key),
  instead of trusting the front end.
- **Money is `decimal`, never floating point.** Amounts, balances, quantities and cost basis are
  stored as `decimal` so totals and ROI do not drift from rounding.
- **External prices are cached and isolated.** Quotes (Finnhub), gold spot prices (Gold-API) and FX
  rates (exchangerate.host) go through one `MarketDataService` with a 15-minute cache, so a slow or
  rate-limited provider does not break the dashboard.
- **Imports deduplicate.** CSV and OFX/QFX bank-statement imports hash each row on account, date,
  amount and normalized description, and skip rows that already exist, so re-importing a statement
  does not double-count.
- **A safe public demo.** The demo button signs into a dedicated seeded account; visitors never see
  real data, and the seed scripts in `supabase/` are idempotent so the demo can be reset safely.

## Tech stack

- **API:** C#, .NET 9, ASP.NET Core, Entity Framework Core 9, deployed on AWS App Runner (Docker, via GitHub Actions)
- **Front end:** React 19, TypeScript (strict), Vite, TanStack Query, react-hook-form, zod, Recharts, Tailwind, deployed on Vercel
- **Data and auth:** PostgreSQL on Supabase, Supabase Auth (JWT)
- **Localization:** English and Canadian French

## Run it locally

Prerequisites: .NET 9 SDK, Node.js 18+, and a PostgreSQL database (local or Supabase).

```bash
# API: http://localhost:5000 (OpenAPI docs at /scalar in development)
cd apps/api/FinanceTracker
dotnet run

# Front end: http://localhost:5173
cd apps/web
npm install
npm run dev
```

Configuration lives in `apps/api/FinanceTracker/appsettings.Development.json` (connection string,
Supabase issuer, CORS origins) and `apps/web/.env` (`VITE_API_BASE_URL`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, and optional demo account credentials). Both files are gitignored.
Endpoint documentation is in [API.md](./API.md).

## How it's tested

```bash
dotnet test FinanceTracker.sln
```

158 xUnit integration tests run the API in-process with `WebApplicationFactory` and cover the
transaction, category, account, asset, net-worth and summary endpoints, request validation, error handling, the market-data and ROI services, and multi-user
isolation. CI runs the full suite on every push and pull request, and a deploy to App Runner only
happens after it passes, followed by a health check (`/health`).

## Known limitations and next steps

- **Tests use EF Core's in-memory provider**, so PostgreSQL-specific behaviour (unique constraints,
  row-level security) is not exercised by the suite. Next: run the integration tests against a
  real PostgreSQL container.
- **Editing a transaction in the web client still deletes and re-creates it**, even though the API
  now has a `PUT /transactions/{id}` endpoint. Switching the client over is the next fix, since the
  current approach changes the transaction's ID and is not atomic.
- **There are no front-end tests yet.** The front end is checked by the TypeScript build only.
- Budgets, spending alerts and recurring transactions are not built. The "AI Assistant" page is a
  placeholder.

## How it was built

I used Claude Code for implementation while making the architecture decisions and reviewing the
output myself. [CLAUDE.md](./CLAUDE.md) is the brief that governed the front-end redesign.

## License

All rights reserved. The code is public for review and is not licensed for reuse.
