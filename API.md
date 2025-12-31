# WealthWise API Documentation

REST API for personal finance tracking. Handles transactions, categories, accounts, assets, and net worth calculation.

## Base URL

**Production**: `https://ugwm6qnmpp.us-east-2.awsapprunner.com`  
**Local Development**: `http://localhost:5000`

## Authentication

All endpoints (except `/health`) require JWT Bearer authentication via Supabase Auth.

### Request Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Getting a Token

Users authenticate through the frontend, which communicates with Supabase Auth. The frontend then includes the JWT in API requests.

**Demo Mode**: The system includes a pre-seeded demo account accessible via "Continue as Demo" in the frontend.

### Error Responses

| Status Code | Meaning |
|-------------|---------|
| `401 Unauthorized` | Missing or invalid JWT token |
| `403 Forbidden` | Valid token but insufficient permissions |
| `404 Not Found` | Resource does not exist or user lacks access |

## Data Isolation

All resources are scoped to the authenticated user. Users can only access their own:
- Transactions
- Categories
- Accounts
- Account snapshots
- Assets

This is enforced at both the application layer (filtering by `UserId`) and database layer (Row Level Security policies in PostgreSQL).

---

## Endpoints

### Health

#### `GET /health`

Health check endpoint (no authentication required).

**Response**: `200 OK`
```json
{
  "status": "ok"
}
```

#### `GET /health/ready`

Readiness probe including database connectivity check.

**Response**: `200 OK` if ready, `503 Service Unavailable` if not.

---

### Transactions

#### `GET /transactions`

List transactions for the authenticated user with optional date filtering and pagination.

**Query Parameters**:
- `page` (optional, default: 1) - Page number
- `pageSize` (optional, default: 20) - Items per page
- `from` (optional) - Start date (YYYY-MM-DD)
- `to` (optional) - End date (YYYY-MM-DD)

**Response**: `200 OK`
```json
{
  "items": [
    {
      "id": 1,
      "amount": -45.50,
      "date": "2025-01-15",
      "description": "Grocery shopping",
      "category": {
        "id": 1,
        "name": "Groceries"
      }
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 47
}
```

#### `POST /transactions`

Create a new transaction.

**Request Body**:
```json
{
  "amount": -89.99,
  "date": "2025-01-20",
  "categoryId": 1,
  "description": "Weekly groceries"
}
```

**Response**: `201 Created`
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

**Response**: `204 No Content`

---

### Categories

#### `GET /categories`

List all categories for the authenticated user, ordered by name.

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "name": "Groceries"
  },
  {
    "id": 2,
    "name": "Transportation"
  }
]
```

#### `POST /categories`

Create a new category. Duplicate names (case-insensitive) are rejected.

**Request Body**:
```json
{
  "name": "Entertainment"
}
```

**Response**: `201 Created`
```json
{
  "id": 3,
  "name": "Entertainment"
}
```

---

### Accounts

#### `GET /accounts`

List all accounts for the authenticated user.

**Response**: `200 OK`
```json
[
  {
    "id": "a1b2c3d4-...",
    "name": "Chase Checking",
    "institution": "Chase",
    "type": "bank",
    "currency": "USD",
    "isLiability": false,
    "latestBalance": 5432.10,
    "latestBalanceDate": "2025-01-15",
    "snapshotCount": 30
  }
]
```

#### `POST /accounts`

Create a new account.

**Request Body**:
```json
{
  "name": "Savings Account",
  "institution": "Bank of America",
  "type": "bank",
  "currency": "USD",
  "isLiability": false
}
```

**Response**: `201 Created`

---

### Account Snapshots

#### `PUT /accounts/{accountId}/snapshots/{date}`

Create or update a balance snapshot for a specific date (YYYY-MM-DD).

**Request Body**:
```json
{
  "balance": 5432.10
}
```

**Response**: `200 OK`
```json
{
  "id": "snapshot-guid",
  "accountId": "account-guid",
  "date": "2025-01-15",
  "balance": 5432.10
}
```

**Behavior**: If a snapshot exists for this account and date, the balance is updated. Otherwise, a new snapshot is created. Unique constraint enforced on (accountId, date).

---

### Assets

#### `GET /assets`

List all assets for the authenticated user.

**Response**: `200 OK`
```json
[
  {
    "id": "guid-1",
    "name": "Apple Stock",
    "assetClass": "stock",
    "ticker": "AAPL",
    "quantity": 100,
    "unit": "shares",
    "costBasisTotal": 15000,
    "purchaseDate": "2024-01-15",
    "notes": "Long-term hold"
  }
]
```

#### `POST /assets`

Create a new asset.

**Request Body**:
```json
{
  "name": "Vanguard S&P 500",
  "assetClass": "stock",
  "ticker": "VOO",
  "quantity": 50,
  "unit": "shares",
  "costBasisTotal": 20000,
  "purchaseDate": "2024-06-01",
  "notes": "Index fund"
}
```

**Response**: `201 Created`

---

### Net Worth

#### `GET /networth/history`

Get net worth time-series data for the authenticated user.

**Query Parameters**:
- `from` (required) - Start date (YYYY-MM-DD)
- `to` (required) - End date (YYYY-MM-DD)
- `interval` (optional, default: "daily") - Grouping: `daily`, `weekly`, `monthly`

**Response**: `200 OK`
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
    }
  ]
}
```

**Calculation**: Net worth is derived from account snapshots. Assets are counted positively, liabilities negatively. Missing dates are excluded from the response.

---

### Monthly Summary

#### `GET /summary/monthly`

Get aggregated financial summary for a specific month.

**Query Parameters**:
- `month` (required) - Month in YYYY-MM format

**Response**: `200 OK`
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
    }
  ]
}
```

**Calculation**: Income is the sum of positive transaction amounts. Expenses is the sum of negative amounts. Breakdown groups expenses by category, ordered by total (most negative first).

---

## Error Handling

All errors return a consistent JSON structure with HTTP status codes and a TraceId for debugging.

**Error Response Format**:
```json
{
  "error": "Category already exists.",
  "traceId": "0HNI6M9P660RI"
}
```

**HTTP Status Codes**:
- `400 Bad Request` - Validation errors (missing fields, invalid formats)
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - Valid token but user lacks permission
- `404 Not Found` - Resource not found or user lacks access
- `409 Conflict` - Business rule violations (e.g., duplicate category)
- `500 Internal Server Error` - Unexpected errors

**Example Validation Error**:
```json
{
  "error": "The Name field is required.",
  "traceId": "0HNI6MAC01ADF"
}
```

The TraceId correlates with server logs for troubleshooting.

---

## Rate Limiting

Currently no rate limiting is enforced. This may change in production as usage scales.

---

## CORS

The API supports cross-origin requests from configured origins (e.g., the Vercel-hosted frontend). CORS is configured via the `CORS_ALLOWED_ORIGINS` environment variable.

**Allowed Headers**:
- `Authorization`
- `Content-Type`

**Allowed Methods**:
- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`

---

## Local Development

Run the API locally:

```bash
cd apps/api/FinanceTracker
dotnet run
```

API runs at `http://localhost:5000`. OpenAPI documentation (Scalar UI) is available at `http://localhost:5000/scalar` in development mode.

---

## Testing

Run the test suite:

```bash
cd apps/api
dotnet test
```

The API includes 118 integration tests covering all endpoints, validation, error handling, and multi-user data isolation.
