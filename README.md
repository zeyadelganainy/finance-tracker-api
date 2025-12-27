# Finance Tracker API

A simple backend API built with **.NET 9** and **PostgreSQL (Supabase)** to track spending categories, transactions, and generate monthly summaries.

This project is intentionally scoped small to demonstrate clean backend fundamentals:
- database modeling
- EF Core migrations
- REST APIs
- basic aggregation logic
- CI setup

---

## Features (V1)

- **Categories**
  - Create categories
  - List categories

- **Transactions**
  - Create income/expense transactions
  - List transactions with optional date filtering

- **Monthly Summary**
  - Total income
  - Total expenses
  - Net total
  - Expense breakdown by category

- **API Documentation**
  - OpenAPI UI via **Scalar**

---

## Tech Stack

- **.NET 9** (ASP.NET Core Web API)
- **Entity Framework Core 9**
- **PostgreSQL** (Supabase)
- **OpenAPI** (Scalar UI)
- **GitHub Actions** (CI build)

---

## Running Locally

### 1. Clone the repository
```bash
git clone https://github.com/zeyadelganainy/finance-tracker-api.git
cd finance-tracker-api
```

### 2. Configure database connection
Create `appsettings.Development.json` (this file is ignored by Git):

```json
{
  "ConnectionStrings": {
    "Default": "Host=...;Port=5432;Database=postgres;Username=postgres;Password=...;Ssl Mode=Require;Trust Server Certificate=true"
  }
}
```

> ⚠️ Never commit real connection strings.
See .env.example for reference.

### 3. Apply migrations

```bash
dotnet ef database update
```

### 4. Run the API

```bash
dotnet run
```

---

## API Documentation

**Scalar UI:** http://localhost:5195/scalar

**OpenAPI JSON:** http://localhost:5195/openapi/v1.json

---

## API Endpoints (V1)

### Categories
- `GET /categories` — List all categories
- `POST /categories` — Create a new category

### Transactions
- `GET /transactions?from=YYYY-MM-DD&to=YYYY-MM-DD` — List transactions with optional date filtering
- `POST /transactions` — Create a new transaction

### Summary
- `GET /summary/monthly?month=YYYY-MM` — Get monthly spending summary

---

## CI/CD

This repository includes a GitHub Actions workflow that:
- Restores dependencies
- Builds the project on every push and pull request

---

## Future Improvements

- Authentication and user scoping
- Pagination and validation improvements
- Automated tests
- Budgeting and analytics extensions

---

## Why This Project

This project was built to demonstrate:
- Understanding of backend architecture
- Database-first thinking
- Clean, maintainable APIs
- Practical CI usage

Rather than building a large, unfocused system, this API focuses on correctness, clarity, and incremental growth.