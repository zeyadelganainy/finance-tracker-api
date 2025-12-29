# Finance Tracker API

![CI Status](https://github.com/zeyadelganainy/finance-tracker-api/workflows/CI/badge.svg)
[![.NET 9](https://img.shields.io/badge/.NET-9.0-512BD4)](https://dotnet.microsoft.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org/)

A REST API for tracking personal finances. Handles transactions, categories, assets, and net worth calculation over time. Built to demonstrate clean API design, testing discipline, and production infrastructure.

---

## Key Features

- **Transaction Management** - Create, list, and delete income/expense transactions with date filtering and pagination
- **Category Organization** - Unique categories with duplicate prevention enforced at the database level
- **Account & Asset Tracking** - Multiple account types (bank, investment, credit) with asset class and ticker support
- **Historical Balance Snapshots** - Upsert-based balance tracking by date with unique constraints
- **Net Worth Calculation** - Time-series net worth queries with configurable intervals (daily, weekly, monthly)
- **Monthly Summaries** - Aggregated income, expense, and category breakdown
- **Structured Validation** - Input validation with error responses including TraceId for debugging
- **Health Monitoring** - Liveness and readiness probes with database connectivity checks
- **CI/CD Integration** - Automated testing and build verification via GitHub Actions
- **96 Integration Tests** - Endpoint coverage including validation and error scenarios

---

## Tech Stack

- **.NET 9** - Web API framework
- **ASP.NET Core** - HTTP pipeline and routing
- **Entity Framework Core 9** - ORM with migrations
- **PostgreSQL 16** - Relational database (hosted on Supabase)
- **xUnit** - Testing framework with 96 integration tests
- **GitHub Actions** - CI pipeline with NuGet caching
- **OpenAPI** - API specification (development environment only)

---

## Architecture Overview

API-first backend designed for frontend integration or direct consumption.

**Design Principles:**
- DTOs are used to prevent EF Core entities from leaking into the API surface
- Global middleware handles exceptions, request logging, and CORS
- Repository pattern is abstracted through EF Core DbContext
- Database indexes optimize common queries (transactions by date, category)
- Explicit foreign key behaviors prevent accidental data loss

**Request Pipeline:**
1. CORS policy enforcement
2. Request logging middleware (method, path, status, duration, traceId)
3. Exception handling middleware (structured error responses)
4. Controller routing and action execution
5. EF Core with optimized queries and change tracking

**Testing Strategy:**
- Integration tests use in-memory database
- Tests verify controller-level behavior
- Validation rules are covered
- Error handling scenarios are tested
- Health endpoints are monitored

---

## API Documentation

### Categories

Organize transactions into unique, case-insensitive categories.

#### `GET /categories`
List all categories ordered by name.

**Response:**
```json
[
  { "id": 1, "name": "Groceries" },
  { "id": 2, "name": "Transportation" }
]
```

#### `POST /categories`
Create a new category. Duplicate names are rejected.

**Request:**
```json
{
  "name": "Entertainment"
}
```

**Response:** `201 Created`
```json
{
  "id": 3,
  "name": "Entertainment"
}
```

---

### Transactions

Track income (positive amounts) and expenses (negative amounts).

#### `GET /transactions?page=1&pageSize=20&from=2025-01-01&to=2025-01-31`
List transactions with pagination and date filtering.

**Query Parameters:**
- `page` (optional) - Page number, default: 1
- `pageSize` (optional) - Items per page, default: 20
- `from` (optional) - Start date (YYYY-MM-DD)
- `to` (optional) - End date (YYYY-MM-DD)

**Response:**
```json
{
  "items": [
    {
      "id": 101,
      "amount": -45.50,
      "date": "2025-01-15",
      "description": "Grocery shopping",
      "category": {
        "id": 1,
        "name": "Groceries"
      }
    },
    {
      "id": 102,
      "amount": 3000.00,
      "date": "2025-01-01",
      "description": "Salary",
      "category": {
        "id": 5,
        "name": "Income"
      }
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 47,
  "totalPages": 3
}
```

#### `POST /transactions`
Create a new transaction.

**Request:**
```json
{
  "amount": -89.99,
  "date": "2025-01-20",
  "categoryId": 1,
  "description": "Weekly groceries"
}
```

**Response:** `201 Created`
```json
{
  "id": 103,
  "amount": -89.99,
  "date": "2025-01-20",
  "description": "Weekly groceries",
  "category": {
    "id": 1,
    "name": "Groceries"
  }
}
```

#### `DELETE /transactions/{id}`
Delete a transaction by ID.

**Response:** `204 No Content`

---

### Accounts

Manage bank accounts, investments, and liabilities.

#### `GET /accounts`
List all accounts ordered by name.

**Response:**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Chase Checking",
    "type": "bank",
    "isLiability": false
  },
  {
    "id": "f9e8d7c6-b5a4-3210-fedc-ba0987654321",
    "name": "Visa Credit Card",
    "type": "credit",
    "isLiability": true
  }
]
```

#### `POST /accounts`
Create a new account.

**Request:**
```json
{
  "name": "Savings Account",
  "type": "bank",
  "isLiability": false
}
```

**Response:** `201 Created`
```json
{
  "id": "new-guid-here",
  "name": "Savings Account",
  "type": "bank",
  "isLiability": false
}
```

---

### Assets

Track investment assets with asset classes and ticker symbols.

#### `GET /assets`
List all asset accounts ordered by name.

**Response:**
```json
[
  {
    "id": "guid-1",
    "name": "Apple Stock",
    "assetClass": "stock",
    "ticker": "AAPL"
  },
  {
    "id": "guid-2",
    "name": "Bitcoin",
    "assetClass": "crypto",
    "ticker": "BTC"
  }
]
```

#### `POST /assets`
Create a new asset with optional asset class and ticker.

**Request:**
```json
{
  "name": "Vanguard S&P 500",
  "assetClass": "stock",
  "ticker": "VOO"
}
```

**Response:** `201 Created`
```json
{
  "id": "guid-3",
  "name": "Vanguard S&P 500",
  "assetClass": "stock",
  "ticker": "VOO"
}
```

---

### Account Snapshots

Track historical account balances with upsert-by-date semantics.

#### `PUT /accounts/{accountId}/snapshots/{date}`
Create or update a balance snapshot for a specific date (YYYY-MM-DD).

**Request:**
```json
{
  "balance": 5432.10
}
```

**Response:** `200 OK`
```json
{
  "id": "snapshot-guid",
  "accountId": "account-guid",
  "date": "2025-01-15",
  "balance": 5432.10
}
```

**Behavior:**
- If snapshot exists for this account+date, balance is updated
- If snapshot doesn't exist, new one is created
- Unique constraint enforced on (accountId, date)

---

### Net Worth

Calculate net worth over time across all accounts.

#### `GET /networth/history?from=2025-01-01&to=2025-01-31&interval=daily`
Get net worth time-series data.

**Query Parameters:**
- `from` (required) - Start date (YYYY-MM-DD)
- `to` (required) - End date (YYYY-MM-DD)
- `interval` (optional) - Grouping: `daily`, `weekly`, `monthly` (default: `daily`)

**Response:**
```json
{
  "from": "2025-01-01",
  "to": "2025-01-31",
  "interval": "daily",
  "dataPoints": [
    {
      "date": "2025-01-01",
      "netWorth": 25430.50
    },
    {
      "date": "2025-01-02",
      "netWorth": 25680.75
    },
    {
      "date": "2025-01-03",
      "netWorth": 25550.20
    }
  ]
}
```

**Calculation:**
- Net worth is calculated from account snapshots grouped by interval
- Assets minus liabilities
- Missing dates are excluded from response

---

### Monthly Summary

#### `GET /summary/monthly?month=2025-01`
Get aggregated summary for a specific month (YYYY-MM).

**Response:**
```json
{
  "month": "2025-01",
  "totalIncome": 3500.00,
  "totalExpenses": -1250.75,
  "net": 2249.25,
  "expenseBreakdown": [
    {
      "categoryId": 1,
      "categoryName": "Groceries",
      "total": -450.50
    },
    {
      "categoryId": 2,
      "categoryName": "Transportation",
      "total": -320.25
    },
    {
      "categoryId": 3,
      "categoryName": "Entertainment",
      "total": -480.00
    }
  ]
}
```

**Calculation:**
- Income is sum of positive transaction amounts
- Expenses is sum of negative transaction amounts
- Breakdown groups expenses by category, ordered by total (most negative first)

---

## Error Handling

All errors return a consistent JSON structure with HTTP status codes and TraceId for debugging.

**Error Response Format:**
```json
{
  "error": "Category already exists.",
  "traceId": "0HNI6M9P660RI"
}
```

**HTTP Status Codes:**
- `400 Bad Request` - Validation errors (missing required fields, invalid formats)
- `404 Not Found` - Resource not found (account, transaction, category)
- `409 Conflict` - Business rule violations (duplicate category name, transaction references deleted category)
- `500 Internal Server Error` - Unexpected server errors

**Example Validation Error:**
```json
{
  "error": "The Name field is required.",
  "traceId": "0HNI6MAC01ADF"
}
```

**Example Conflict Error:**
```json
{
  "error": "Category already exists.",
  "traceId": "0HNI6MAC01ADF"
}
```

TraceId correlates errors with request logs for debugging.

---

## Health & Observability

### Health Endpoints

#### `GET /health`
Liveness probe. Checks if the service is running.

**Response:** `200 OK`
```json
{
  "status": "ok"
}
```

Used for Kubernetes liveness probes and load balancer health checks.

#### `GET /health/ready`
Readiness probe. Checks if the service can handle traffic (includes database connectivity).

**Response:** `200 OK` (ready)
```json
{
  "status": "ready"
}
```

**Response:** `503 Service Unavailable` (not ready)
```json
{
  "status": "not_ready"
}
```

Used for Kubernetes readiness probes and deployment verification.

---

### Request Logging

Every HTTP request is logged with:
- HTTP method (GET, POST, etc.)
- Request path
- Status code
- Duration in milliseconds
- Unique TraceId

**Example log entry:**
```
[2025-01-20 14:32:15] info: FinanceTracker.Middleware.RequestLoggingMiddleware[0]
      HTTP GET /transactions => 200 in 45ms TraceId=0HNI6M9P660RI
```

Logs are used for:
- Performance monitoring (identify slow endpoints)
- Error correlation (match TraceId from error responses)
- Traffic analysis (requests per second, popular endpoints)

---

## Running Locally

### Prerequisites
- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [PostgreSQL 16+](https://www.postgresql.org/download/)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/zeyadelganainy/finance-tracker-api.git
   cd finance-tracker-api
   ```

2. **Configure database connection**
   
   Edit `FinanceTracker/appsettings.Development.json`:
   ```json
   {
     "ConnectionStrings": {
       "Default": "Host=localhost;Database=finance_tracker;Username=your_user;Password=your_password"
     },
     "Cors": {
       "AllowedOrigins": [
         "http://localhost:3000",
         "http://localhost:5173"
       ]
     }
   }
   ```

   Never commit real connection strings. Use environment variables in production.

3. **Apply database migrations**
   ```bash
   cd FinanceTracker
   dotnet ef database update
   ```

   This creates all tables, indexes, and constraints.

4. **Run the API**
   ```bash
   dotnet run
   ```

   API runs at `http://localhost:5000`
   
   OpenAPI docs (development only) at `http://localhost:5000/scalar`

5. **Verify health**
   ```bash
   curl http://localhost:5000/health
   curl http://localhost:5000/health/ready
   ```

### Running Tests

```bash
# Run all tests
dotnet test

# Run with detailed output
dotnet test --verbosity normal

# Run in Release configuration
dotnet test -c Release
```

96 integration tests cover all endpoints, validation, and error scenarios.

---

## CI & Quality

### Continuous Integration

GitHub Actions workflow runs on every push and pull request:

1. **Restore** - Download NuGet packages (with caching for faster builds)
2. **Build** - Compile in Release configuration
3. **Test** - Run all 96 tests with detailed output
4. **Format Check** - Verify code formatting (non-blocking)

**Build Status:** ![CI Status](https://github.com/zeyadelganainy/finance-tracker-api/workflows/CI/badge.svg)

### Quality Metrics

- **Test Coverage:** 96 integration tests (100% pass rate)
- **Test Strategy:** Controller-level integration tests with in-memory database
- **Code Quality:** Automated formatting checks in CI
- **Documentation:** API documentation and deployment guides

### Database Quality

- **Performance:** Indexed queries on `Transactions.Date` and `Transactions.CategoryId`
- **Data Integrity:** Unique constraints on category names and account snapshots
- **Referential Integrity:** Explicit foreign key behaviors (RESTRICT for transactions, CASCADE for snapshots)
- **Migration Safety:** Schema changes version-controlled with EF Core migrations

---

## Production Deployment

### Docker

```bash
# Build image
docker build -t finance-tracker-api .

# Run container
docker run -d -p 8080:8080 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e ConnectionStrings__Default="Host=db;Database=finance;Username=user;Password=pass" \
  -e Cors__AllowedOrigins__0="https://your-frontend.com" \
  finance-tracker-api

# Verify health
curl http://localhost:8080/health
curl http://localhost:8080/health/ready
```

### Kubernetes

Example deployment with health checks:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: finance-tracker-api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: finance-tracker-api:latest
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        env:
        - name: ASPNETCORE_ENVIRONMENT
          value: "Production"
        - name: ConnectionStrings__Default
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: connection-string
```

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete deployment instructions.

---

## Configuration

### Environment Variables

**Required:**
- `ASPNETCORE_ENVIRONMENT` - Environment name (Production, Development)
- `ConnectionStrings__Default` - PostgreSQL connection string

**Optional:**
- `Cors__AllowedOrigins__0` - Allowed CORS origins (add multiple with __1, __2, etc.)
- `Logging__LogLevel__Default` - Logging level (Information, Warning, Error)

**Example:**
```bash
export ASPNETCORE_ENVIRONMENT=Production
export ConnectionStrings__Default="Host=prod-host;Database=finance;Username=user;Password=pass;SSL Mode=Require"
export Cors__AllowedOrigins__0="https://finance-app.com"
```

### Database Connection String Format

```
Host=hostname;Database=dbname;Username=user;Password=pass;SSL Mode=Require;Trust Server Certificate=true
```

Use managed secrets (Azure Key Vault, AWS Secrets Manager, Kubernetes Secrets) in production.

---

## Project Structure

```
FinanceTracker/
├── Controllers/           # API endpoints (Categories, Transactions, etc.)
├── Models/               # Entity models (Category, Transaction, Account, etc.)
├── Contracts/            # Request/response DTOs (no EF leakage)
├── Data/                 # EF Core DbContext and configurations
├── Middleware/           # Request logging and exception handling
├── Migrations/           # EF Core database migrations
└── Program.cs            # Application startup and configuration

FinanceTracker.Tests/
├── *ControllerTests.cs   # Integration tests for each controller
├── ValidationTests.cs    # Input validation tests
├── ExceptionHandlingTests.cs  # Error handling tests
└── CustomWebApplicationFactory.cs  # Test infrastructure
```

---

## Roadmap

- **Authentication & Authorization** - JWT-based user authentication with role-based access control
- **Multi-User Support** - User isolation and data privacy
- **Recurring Transactions** - Automated transaction generation for recurring income/expenses
- **Budget Management** - Set and track budgets by category with alerts
- **Export Functionality** - CSV/PDF export for transactions and reports
- **Frontend Dashboard** - React-based UI for data visualization
- **Mobile API Support** - Optimized endpoints for mobile apps

---

## License

MIT License

---

## Contact

- **GitHub:** [zeyadelganainy](https://github.com/zeyadelganainy)
- **Repository:** [finance-tracker-api](https://github.com/zeyadelganainy/finance-tracker-api)

---

Backend API with 96 passing tests, CI/CD pipeline, and production deployment support.