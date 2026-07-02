# WealthWise

A personal wealth-tracking system with a React frontend and a .NET API backend. Track transactions, manage accounts and assets, and monitor net worth over time — presented as a calm, data-dense **"private banking terminal"** rather than a generic budgeting app.

## Live System

**Frontend**: https://wealthwise-sable.vercel.app
**API**: https://ugwm6qnmpp.us-east-2.awsapprunner.com

## Design

WealthWise uses a deliberate, high-end fintech aesthetic — think Bloomberg Terminal meets a private wealth report.

- **Dark-first theming** with a warm light mode, switched via a single class on `<html>`. All colors are semantic CSS custom properties (`--bg-surface`, `--text-primary`, `--accent-color`, …) mapped into Tailwind, so the whole app re-themes instantly.
- **Signature palette**: deep charcoal surfaces with a muted **champagne-gold** accent; desaturated success/danger/warning states.
- **Typography pairing**: `Playfair Display` (serif) for the net-worth hero and headings, `Inter` for UI, and `JetBrains Mono` with tabular figures for every monetary value.
- **Custom accent colors**: gold (default), sage, slate, rose, stone — remapped onto the token system.
- **Charts as a first-class surface**: a shared theme (`src/lib/chartTheme.ts`) drives every Recharts component — muted palette, thin lines, gradient area fills, thick donuts, minimal gridlines, themed tooltips — no default library styling anywhere.

See [CLAUDE.md](./CLAUDE.md) for the full design brief.

## Architecture

**Frontend**:
- React 19 + TypeScript (strict)
- Vite for development and bundling
- TailwindCSS with a semantic design-token system
- Recharts for data visualization
- TanStack Query for data fetching, react-i18next for localization
- Deployed on Vercel

**Backend**:
- .NET 9 REST API
- Entity Framework Core 9 with PostgreSQL
- JWT authentication via Supabase Auth (JWKS, RS256)
- Deployed on AWS App Runner (us-east-2)

**Database**:
- PostgreSQL 16 (hosted on Supabase)
- Row-level security policies for multi-user data isolation

**Market data integrations**:
- **Finnhub** — live stock/ETF quotes
- **Gold-API** — live gold spot price (by weight unit)
- **exchangerate.host** — FX conversion for multi-currency portfolios

## Demo Mode

The system includes a "Continue as Demo" option that logs into a pre-seeded demo account containing sample transactions, categories, accounts, and a diversified asset portfolio. New users start with empty data and add their own.

## Repository Structure

```
finance-tracker/
├── apps/
│   ├── api/              # .NET 9 REST API
│   │   ├── FinanceTracker/
│   │   └── FinanceTracker.Tests/
│   └── web/              # React + Vite frontend
│       └── src/
│           ├── components/   # UI primitives + feature components
│           ├── pages/        # Route-level screens
│           ├── lib/          # api client, chartTheme, utils
│           └── settings/     # theme/accent/locale/currency
├── supabase/             # Migrations, RLS policies, and seed scripts
├── .github/workflows/    # CI/CD pipelines
└── API.md                # API documentation
```

## Local Development

### Prerequisites

- .NET 9 SDK
- Node.js 18+
- PostgreSQL (or use the Supabase-hosted database)

### Running the API

```bash
cd apps/api/FinanceTracker
dotnet restore
dotnet run
```

API runs at `http://localhost:5000`. In development, OpenAPI docs are available at `http://localhost:5000/scalar`.

### Running the Frontend

```bash
cd apps/web
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### Configuration

**API** (`apps/api/FinanceTracker/appsettings.Development.json`):
```json
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Database=financetracker;Username=...;Password=..."
  },
  "Auth": {
    "Issuer": "https://sltityabtomzdavnlinv.supabase.co/auth/v1",
    "Audience": "authenticated"
  },
  "Cors": {
    "AllowedOrigins": ["http://localhost:5173"]
  }
}
```

**Frontend** (`apps/web/.env`):
```bash
VITE_API_BASE_URL=http://localhost:5000
VITE_SUPABASE_URL=https://sltityabtomzdavnlinv.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
# Optional — enables the "Continue as Demo" button
VITE_DEMO_EMAIL=<demo-account-email>
VITE_DEMO_PASSWORD=<demo-account-password>
```

### Seeding Demo Data

Idempotent SQL scripts live in `supabase/` and are run via the Supabase SQL Editor (or `psql`):

- `seed-2026-recent-months.sql` — several recent months of transactions plus monthly account snapshots for net-worth history.
- `seed-demo-assets.sql` — a diversified portfolio (stocks, ETF, gold) that exercises the Finnhub, Gold-API, and exchangerate.host integrations.

Each script skips data that already exists, so they are safe to re-run.

### Running Tests

```bash
cd apps/api
dotnet test
```

The API includes 151 integration tests covering all endpoints, validation, error handling, and multi-user data isolation.

## Deployment

### Frontend (Vercel)

Automatic deployments on push to `main`. Environment variables in Vercel:
- `VITE_API_BASE_URL` — Production API URL
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key

### Backend (AWS App Runner)

Automatic deployments via GitHub Actions on push to `main`:
1. Run tests
2. Build Docker image
3. Push to Amazon ECR (us-east-2)
4. Deploy to App Runner
5. Health check verification

Deployment time: ~8–12 minutes from push to live.

## Key Features

**Transactions**
- Track income and expenses with categories, dates, and descriptions
- Full CRUD with inline editing and bulk select/delete
- Clean data table (mono, right-aligned amounts) on desktop; card list on mobile
- CSV and OFX/QFX bank-statement import with column mapping and deduplication

**Categories**
- User-defined income/expense categories with dependency-checked deletion
- Create categories inline from the transaction flow

**Accounts**
- Bank, credit, investment, and liability accounts
- Manual balance snapshots with a gold-gradient balance-history chart

**Assets & Portfolio**
- Track stocks, ETFs, and gold with cost basis and quantity
- Live market pricing with automatic ROI, unrealized gain/loss, and multi-currency FX
- Portfolio allocation donut, sector breakdown, and per-asset ROI badges

**Net Worth & Analytics**
- Net-worth hero figure (serif, count-up) with an area-chart trend
- Monthly income/expense summaries and a category-breakdown donut
- Portfolio ROI across all assets

**Experience**
- Dark/light mode with customizable accent colors
- Responsive layout: sidebar on desktop, bottom tab bar on mobile
- Multi-language support (English, French-Canadian) and currency selection
- `prefers-reduced-motion` respected; skeleton loaders for async data

**Multi-User Support**
- Each user's data is isolated via row-level filtering and JWT auth

## Roadmap

- Budget tracking and spending alerts
- Recurring transaction automation
- AI-assisted insights (currently a Beta placeholder)

## Tech Details

**Frontend design system**: semantic CSS-variable tokens → Tailwind utilities; shared chart theme; no hardcoded palette colors in components.

**Backend testing**: 151 integration tests with an in-memory database.

**Database optimization**: indexed transaction dates/categories, unique constraints on categories and account snapshots, row-level security.

**Authentication flow**:
1. User authenticates with Supabase Auth (frontend)
2. Supabase returns a JWT
3. Frontend includes the token in API requests
4. API validates the token via the JWKS endpoint
5. User-scoped queries filter by the authenticated user ID

**CORS**: the API allows the Vercel frontend and localhost; wildcard origins are rejected in production.

## API Documentation

See [API.md](./API.md) for authentication, endpoints, request/response formats, and error handling.

## License

MIT
