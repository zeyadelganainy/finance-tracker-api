# AI Insights & Valuation - Documentation

## Overview

The Finance Tracker API includes endpoints designed to prepare data for AI-powered financial insights and asset valuation. **Note: Market pricing and ROI calculations are not yet implemented** - these endpoints provide the data structure needed for future integration.

---

## Asset Valuation Inputs

The `Asset` model stores all necessary inputs for future ROI and valuation calculations:

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Asset name (e.g., "Apple Stock", "Gold Bars") |
| `assetClass` | string | stock, crypto, metal, cashequivalent, realestate |
| `ticker` | string? | Stock symbol (e.g., "AAPL", "BTC") - used for price lookups |
| `quantity` | decimal | Amount held (e.g., 100 shares, 10 oz) |
| `unit` | string? | Measurement unit (shares, oz, g, kg, btc) |
| `costBasisTotal` | decimal | Total cost basis for ROI calculation |
| `purchaseDate` | DateTime? | When asset was acquired |
| `notes` | string? | Additional context for AI analysis |

**Example Asset Record**:
```json
{
  "id": "guid",
  "name": "Apple Stock",
  "assetClass": "stock",
  "ticker": "AAPL",
  "quantity": 100,
  "unit": "shares",
  "costBasisTotal": 15000.00,
  "purchaseDate": "2024-01-15",
  "notes": "Tech investment portfolio"
}
```

---

## Endpoints

### 1. AI Context Endpoint

**GET /ai/context**

Returns comprehensive financial data structured for AI/LLM analysis.

**Purpose**: Provides all data needed for an AI assistant to generate insights about:
- Financial health
- Spending patterns
- Asset allocation recommendations
- Budget suggestions

**Response Structure**:
```json
{
  "accounts": {
    "totalAccounts": 3,
    "totalBalance": 25000.00,
    "items": [
      {
        "id": "guid",
        "name": "Checking",
        "type": "bank",
        "isLiability": false,
        "latestBalance": 5000.00,
        "latestBalanceDate": "2025-01-15"
      }
    ]
  },
  "assets": {
    "totalAssets": 2,
    "totalCostBasis": 35000.00,
    "items": [
      {
        "id": "guid",
        "name": "Apple Stock",
        "assetClass": "stock",
        "ticker": "AAPL",
        "quantity": 100,
        "unit": "shares",
        "costBasisTotal": 15000.00,
        "purchaseDate": "2024-01-15"
      }
    ]
  },
  "transactions": {
    "totalCount": 150,
    "totalIncome": 45000.00,
    "totalExpenses": -12000.00,
    "netCashFlow": 33000.00,
    "earliestDate": "2024-01-01",
    "latestDate": "2025-01-15",
    "categoryBreakdown": [
      {
        "categoryName": "Groceries",
        "total": -3500.00,
        "count": 45
      }
    ]
  },
  "categories": {
    "totalCategories": 10,
    "categoryNames": ["Groceries", "Salary", "Rent", ...]
  }
}
```

**Use Cases**:
- AI chatbot integration
- Automated financial advice
- Spending pattern analysis
- Budget recommendations

**Example AI Prompt**:
```
Given this financial context: {ai_context_data}

Analyze the user's:
1. Monthly cash flow trend
2. Top 3 expense categories
3. Asset allocation
4. Recommendations for savings rate
```

---

### 2. Asset Valuation Endpoints

#### GET /assets/valuation

Returns valuation data for all assets. **Currently returns null for market prices** - this allows the frontend to build the UI now and populate with real data later.

**Response**:
```json
{
  "assets": [
    {
      "assetId": "guid",
      "name": "Apple Stock",
      "assetClass": "stock",
      "ticker": "AAPL",
      "quantity": 100,
      "unit": "shares",
      "costBasisTotal": 15000.00,
      "currentPrice": null,
      "currentValue": null,
      "unrealizedGainLoss": null,
      "roiPercentage": null,
      "valuationStatus": "NOT_AVAILABLE"
    }
  ],
  "message": "Market pricing not enabled yet. Valuation fields will be populated when pricing service is integrated."
}
```

**Valuation Fields Explanation**:

| Field | Formula (when implemented) | Example |
|-------|---------------------------|---------|
| `currentPrice` | Live market price per unit | $170.50/share |
| `currentValue` | `quantity * currentPrice` | $17,050 |
| `unrealizedGainLoss` | `currentValue - costBasisTotal` | $2,050 |
| `roiPercentage` | `(unrealizedGainLoss / costBasisTotal) * 100` | 13.67% |

#### GET /assets/{id}/valuation

Returns valuation data for a specific asset.

**Response**:
```json
{
  "assetId": "guid",
  "name": "Gold Bars",
  "assetClass": "metal",
  "ticker": null,
  "quantity": 10,
  "unit": "oz",
  "costBasisTotal": 20000.00,
  "currentPrice": null,
  "currentValue": null,
  "unrealizedGainLoss": null,
  "roiPercentage": null,
  "valuationStatus": "NOT_AVAILABLE"
}
```

---

## Future Integration

### Market Pricing Service

When market pricing is implemented, the system will:

1. **Fetch prices based on ticker**:
   - Stocks: Yahoo Finance, Alpha Vantage, or similar API
   - Crypto: CoinGecko, CoinMarketCap
   - Metals: Gold price APIs (per oz)

2. **Calculate valuation fields**:
   ```csharp
   currentPrice = FetchPriceFromAPI(asset.Ticker, asset.AssetClass);
   currentValue = asset.Quantity * currentPrice;
   unrealizedGainLoss = currentValue - asset.CostBasisTotal;
   roiPercentage = (unrealizedGainLoss / asset.CostBasisTotal) * 100;
   ```

3. **Cache prices** to avoid excessive API calls

4. **Update `valuationStatus`**:
   - `"LIVE"` - Real-time price available
   - `"CACHED"` - Using cached price (with timestamp)
   - `"STALE"` - Price older than threshold
   - `"NOT_AVAILABLE"` - No pricing source available

### AI-Generated Insights

Example AI service integration:

```typescript
// Frontend: Fetch context and send to AI
const context = await api<AIContext>('/ai/context');

const prompt = `
Based on this financial data: ${JSON.stringify(context)}

Provide:
1. Overall financial health score (1-10)
2. Top 3 spending categories to reduce
3. Asset allocation recommendation
4. Emergency fund adequacy
`;

const insights = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: prompt }]
});
```

---

## Frontend Integration

### TypeScript Types

```typescript
// types/ai.ts
export interface AIContext {
  accounts: AIAccountsSummary;
  assets: AIAssetsSummary;
  transactions: AITransactionsSummary;
  categories: AICategoriesSummary;
}

export interface AssetValuationData {
  assetId: string;
  name: string;
  assetClass: string;
  ticker?: string;
  quantity: number;
  unit?: string;
  costBasisTotal: number;
  currentPrice?: number;
  currentValue?: number;
  unrealizedGainLoss?: number;
  roiPercentage?: number;
  valuationStatus: string;
}
```

### Usage Examples

```typescript
// Get AI context for analysis
const context = await api<AIContext>('/ai/context');
console.log(`Total net worth: $${context.accounts.totalBalance + context.assets.totalCostBasis}`);

// Get asset valuations
const valuations = await api<AssetValuationResponse>('/assets/valuation');
valuations.assets.forEach(asset => {
  console.log(`${asset.name}: ${asset.valuationStatus}`);
  // Currently shows "NOT_AVAILABLE" for all
});

// Get single asset valuation
const assetVal = await api<AssetValuationData>(`/assets/${assetId}/valuation`);
```

---

## Testing

### AI Context Tests

```bash
# Test with no data
GET /ai/context
# Expect: Empty structure with all counts = 0

# Test with sample data
# Seed accounts, assets, transactions, categories
GET /ai/context
# Expect: Populated structure with correct totals
```

### Valuation Tests

```bash
# Test valuation stub
GET /assets/valuation
# Expect: All assets with null prices

# Test single asset valuation
GET /assets/{guid}/valuation
# Expect: Asset with null prices and NOT_AVAILABLE status
```

All tests are in:
- `apps/api/FinanceTracker.Tests/AIContextControllerTests.cs`
- `apps/api/FinanceTracker.Tests/ValuationControllerTests.cs`

Run tests:
```bash
cd C:\FinanceTracker
dotnet test
```

---

## Roadmap

### Phase 1: Data Structure ? (Current)
- Asset model with valuation inputs
- AI context endpoint
- Valuation stub endpoint
- Frontend can build UI

### Phase 2: Market Pricing (Future)
- Integrate pricing APIs (stocks, crypto, metals)
- Implement caching layer
- Calculate ROI metrics
- Update valuation endpoints to return real data

### Phase 3: AI Insights (Future)
- Integrate OpenAI or similar LLM
- Generate personalized insights
- Spending pattern analysis
- Budget recommendations
- Investment advice

### Phase 4: Advanced Features (Future)
- Historical valuation tracking
- Performance charts
- Tax lot tracking
- Cost basis adjustments
- Dividend/distribution tracking

---

## Summary

| Feature | Status | Purpose |
|---------|--------|---------|
| Asset valuation inputs | ? Implemented | Store data needed for ROI calculations |
| `/ai/context` endpoint | ? Implemented | Provide structured data for AI analysis |
| `/assets/valuation` endpoints | ? Implemented (stub) | UI-ready, awaiting pricing integration |
| Market pricing | ? Not implemented | Fetch live prices from external APIs |
| ROI calculations | ? Not implemented | Calculate based on market prices |
| AI insights generation | ? Not implemented | Use LLM to generate advice |

**The system is now prepared for AI/valuation features to be plugged in later without breaking changes!**
