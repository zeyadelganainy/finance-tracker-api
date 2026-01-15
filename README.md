# WealthWise

A personal finance tracking system with a React frontend and .NET API backend. Track transactions, manage accounts and assets, and monitor net worth over time.

## Live System

**Frontend**: https://wealthwise-sable.vercel.app  
**API**: https://ugwm6qnmpp.us-east-2.awsapprunner.com  

## Architecture

**Frontend**:
- React 18 + TypeScript
- Vite for development and bundling
- TailwindCSS for styling
- Deployed on Vercel

**Backend**:
- .NET 9 REST API
- Entity Framework Core 9 with PostgreSQL
- JWT authentication via Supabase Auth
- Deployed on AWS App Runner (us-east-2)

**Database**:
- PostgreSQL 16 (hosted on Supabase)
- Row-level security policies for multi-user data isolation

**Authentication**:
- Supabase Auth (JWT Bearer tokens, RS256)
- JWKS-based token validation (no shared secrets)
- User-scoped data access

## Demo Mode

The system includes a "Continue as Demo" option that logs into a pre-seeded demo account. This account contains sample transactions, categories, accounts, and assets for demonstration purposes.

New users start with empty data and can add their own transactions and accounts.

## Repository Structure

```
finance-tracker/
??? apps/
?   ??? api/              # .NET 9 REST API
?   ?   ??? FinanceTracker/
?   ?   ??? FinanceTracker.Tests/
?   ??? web/              # React + Vite frontend
??? supabase/             # Database migration scripts and RLS policies
??? .github/workflows/    # CI/CD pipelines
??? API.md                # API documentation
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
```

### Running Tests

```bash
cd apps/api
dotnet test
```

The API includes 151 integration tests covering all endpoints, validation, error handling, and multi-user data isolation.

## Deployment

### Frontend (Vercel)

The frontend is deployed to Vercel with automatic deployments on push to `main`.

Environment variables in Vercel:
- `VITE_API_BASE_URL` - Production API URL
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Backend (AWS App Runner)

The API is deployed to AWS App Runner with automatic deployments via GitHub Actions.

CI/CD workflow (`.github/workflows/ci.yml`):
1. Run tests
2. Build Docker image
3. Push to Amazon ECR (us-east-2)
4. Deploy to App Runner
5. Health check verification

Environment variables in App Runner:
- `ConnectionStrings__Default` - PostgreSQL connection string
- `Auth__Issuer` - Supabase Auth issuer URL
- `Auth__Audience` - JWT audience claim
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed origins

Deployment time: ~8-12 minutes from push to live.

## API Documentation

See [API.md](./API.md) for complete API documentation including:
- Authentication and authorization
- All available endpoints
- Request/response formats
- Error handling

## Key Features

**Transactions**
- Track income and expenses with categories, dates, and descriptions
- Create, edit, and delete transactions with full CRUD support
- Bulk operations: select all and delete multiple transactions at once
- Attach transactions to specific accounts for better organization
- Mobile-optimized UI for transaction management on phones

**CSV & Bank Statement Import**
- Import transactions from CSV files with customizable column mapping
- Import OFX (Open Financial Exchange) bank statements
- Automatic deduplication to prevent duplicate entries
- Category assignment during import

**Categories**
- Organize transactions into user-defined categories
- Create new categories directly from the transaction page
- Income and expense category types
- Edit and delete categories (with transaction dependency checks)

**Accounts**
- Manage bank accounts, credit cards, and investment accounts
- Track account balances with manual snapshots
- Balance history visualization over time
- Account-specific transaction filtering

**Assets & Portfolio**
- Track stocks, gold, and other investments with cost basis and quantity
- Real-time market price updates via Finnhub (stocks) and Gold-API (gold)
- Automatic ROI calculations with unrealized gains/losses
- Multi-currency support with automatic FX conversion via exchangerate.host
- Portfolio valuation and allocation charts
- Mobile-responsive asset management interface

**Account Snapshots**
- Record account balances at specific dates for historical tracking
- View balance trends over time with charts
- Snapshot history displays correctly (bug fixed)

**Net Worth & Analytics**
- Calculate net worth over time with daily, weekly, or monthly intervals
- Monthly summaries with income, expenses, and category breakdowns
- Portfolio ROI tracking across all assets

**User Experience**
- Dark mode and light mode with customizable accent colors
- Multi-language support: English and French-Canadian
- Currency selection (USD, CAD, EUR, and more)
- Responsive design optimized for mobile and desktop
- Improved sign-in page design

**Multi-User Support**
- Each user's data is isolated and secure with row-level filtering
- JWT-based authentication via Supabase

## Roadmap

**Planned Features**
- Budget tracking and spending alerts
- Recurring transaction automation
- Attaching accounts to transactions

## Tech Details

**Backend Testing**: 151 integration tests with in-memory database

**Database Optimization**:
- Indexed queries on transaction dates and categories
- Unique constraints on categories and account snapshots
- Row-level security policies

**Authentication Flow**:
1. User authenticates with Supabase Auth (frontend)
2. Supabase returns JWT token
3. Frontend includes token in API requests
4. API validates token via JWKS endpoint
5. User-scoped queries filter by authenticated user ID

**CORS Configuration**: The API allows requests from the Vercel frontend and localhost (development). Wildcard origins are rejected in production.

## License

MIT
