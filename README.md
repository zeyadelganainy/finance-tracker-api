# Finance Tracker API (V1)

A simple .NET 9 Web API + Supabase Postgres project to track categories and transactions and generate a monthly spending summary.

## Features
- Categories: create + list
- Transactions: create + list (filter by date range)
- Monthly summary: totals + expense breakdown by category
- OpenAPI docs UI via Scalar

## Tech
- .NET 9 (ASP.NET Core Web API)
- EF Core 9 + PostgreSQL (Supabase)
- Migrations for schema changes

## Run locally
1. Set your connection string in `appsettings.Development.json`:
```json
{
  "ConnectionStrings": {
    "Default": "Host=...;Port=5432;Database=postgres;Username=postgres;Password=...;Ssl Mode=Require;Trust Server Certificate=true"
  }
}
```
2. Run migrations:

```bash
    dotnet ef database update
```

3. Start the API:

```bash
dotnet run
```

### API Docs

Scalar UI: http://localhost:5195/scalar

OpenAPI JSON: http://localhost:5195/openapi/v1.json

### Endpoints (V1)

```
GET /categories

POST /categories

GET /transactions?from=YYYY-MM-DD&to=YYYY-MM-DD

POST /transactions

GET /summary/monthly?month=YYYY-MM

```
