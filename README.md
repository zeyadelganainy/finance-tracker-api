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

The API includes 118 integration tests covering all endpoints, validation, error handling, and multi-user data isolation.

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

**Transactions**: Track income and expenses with categories, dates, and descriptions.

**Categories**: Organize transactions into user-defined categories.

**Accounts**: Manage bank accounts, credit cards, and investment accounts.

**Assets**: Track stocks, cryptocurrencies, and other investments with cost basis and quantity.

**Account Snapshots**: Record account balances at specific dates for historical tracking.

**Net Worth Calculation**: View net worth over time with daily, weekly, or monthly intervals.

**Monthly Summaries**: See aggregated income, expenses, and category breakdowns by month.

**Multi-User Support**: Each user's data is isolated and secure.

## Roadmap

- Asset valuation integration (market prices for stocks, crypto, etc.)
- Budget tracking and alerts
- Recurring transaction support
- Export data (CSV, JSON)
- Mobile-responsive UI improvements

## Tech Details

**Backend Testing**: 118 integration tests with in-memory database

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
