# Finance Tracker - Frontend

A clean, minimal React frontend for the Finance Tracker API.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development
- **date-fns** for date formatting
- No UI libraries - clean, custom styling

## Prerequisites

- Node.js 18+ installed
- Finance Tracker API running at: https://ugwm6qnmpp.us-east-2.awsapprunner.com
- Supabase project (URL + anon key)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Update `.env` with your API URL:

```
VITE_API_BASE_URL=https://ugwm6qnmpp.us-east-2.awsapprunner.com
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_DEMO_EMAIL=demo@example.com
VITE_DEMO_PASSWORD=demo-password
```

**?? Important**: After changing `.env`, restart the dev server!

### 3. Start Development Server

```bash
npm run dev
```

The app will open at: http://localhost:5173

## Features

### Current Features (MVP)

- ? **Transactions Page**
  - View all transactions
  - Search by description or category
  - Clean, card-based layout
  - Color-coded amounts (red for expenses, green for income)
  - Loading and error states

## Project Structure

```
apps/web/
??? src/
?   ??? lib/
?   ?   ??? api.ts              # API client with error handling
?   ??? pages/
?   ?   ??? TransactionsPage.tsx # Main transactions view
?   ??? types/
?   ?   ??? api.ts              # TypeScript types
?   ??? App.tsx                 # Root component
?   ??? App.css                 # Global styles
?   ??? main.tsx                # Entry point
?   ??? index.css               # Base styles
??? .env                        # Environment variables (not committed)
??? .env.example                # Example env file
??? package.json
??? vite.config.ts
```

## API Integration

The app connects to your Finance Tracker API at:

```
https://ugwm6qnmpp.us-east-2.awsapprunner.com
```

### Endpoints Used

- `GET /transactions` - Fetch all transactions with pagination

## Development

### Run Dev Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. **Check API CORS Configuration**
   - Your API must allow requests from `http://localhost:5173`
   - Update `Cors__AllowedOrigins__0` in App Runner to include `http://localhost:5173`

2. **Temporary Fix**: Add `*` to allowed origins (dev only):

   ```
   Cors__AllowedOrigins__0=*
   ```

### "VITE_API_BASE_URL is not defined"

- Make sure `.env` file exists
- Restart the dev server after creating/editing `.env`
- Verify the variable name starts with `VITE_`

### "Failed to load transactions"

1. **Check API is running**:

   ```bash
   curl https://ugwm6qnmpp.us-east-2.awsapprunner.com/health
   ```

2. **Check Browser Console** for specific error messages

3. **Test API directly**:

   ```bash
   curl https://ugwm6qnmpp.us-east-2.awsapprunner.com/transactions
   ```

### Network Errors

- Verify `VITE_API_BASE_URL` in `.env` matches your deployed API
- Check your internet connection
- Verify API is deployed and running in App Runner

### 401/403 Errors

- The app currently doesn't require authentication
- If your API has authentication enabled, you'll need to implement login flow
- Token is stored in `localStorage.getItem('ft_token')` if needed

## Next Steps (Future Enhancements)

- [ ] Add categories page
- [ ] Add accounts page
- [ ] Add net worth tracking
- [ ] Add monthly summary
- [ ] Add transaction creation form
- [ ] Add authentication/login
- [ ] Add data visualization (charts)
- [ ] Add transaction filtering by date range
- [ ] Add pagination controls
- [ ] Deploy to Vercel/Netlify

## AI Roadmap

This frontend is wired and ready for AI-powered features without requiring any backend changes. Here's the implementation plan:

### Phase 1: Data Structure (✅ COMPLETED)

**Status**: All endpoints and UI are ready

- ✅ `/ai/context` endpoint - Fetches comprehensive financial data
- ✅ `/assets/valuation` endpoint - Placeholder for asset pricing
- ✅ AI Page (`/ai`) - Dedicated interface for AI interactions
- ✅ Valuation Section - Asset cards show valuation placeholders
- ✅ AI Insights Card - Dashboard card with "Generate Insights" button

**Deliverables**:
- New `AIPage` component with prompt input
- `useAIContext()` hook for fetching financial data
- `useAssetValuation()` hook for valuation data
- Valuation section on asset cards showing "Coming Soon"
- AI Insights card on dashboard with context viewer

### Phase 2: Market Pricing (FUTURE)

**What Needs to Be Done**:
- Integrate third-party pricing APIs:
  - **Stocks**: Alpha Vantage, IEX Cloud, or Yahoo Finance
  - **Crypto**: CoinGecko API, CoinMarketCap
  - **Metals**: Metals.live API or similar
  
**Frontend Changes Required**: Minimal
- Update `useAssetValuation()` to show real prices
- Valuation section will auto-populate with `currentValue` and `roiPercentage`
- No UI changes needed - just data flowing through

**Backend Changes**: Update `ValuationController`:
```csharp
// Current: Returns null prices
currentPrice: null,
currentValue: null,
roiPercentage: null,
valuationStatus: "NOT_AVAILABLE"

// Future: Returns real data
currentPrice: 150.50,  // From pricing API
currentValue: 15050.00, // quantity * currentPrice
roiPercentage: 13.67,   // ((currentValue - costBasis) / costBasis) * 100
valuationStatus: "AVAILABLE"
```

### Phase 3: LLM Integration (FUTURE)

**What Needs to Be Done**:
1. Set up OpenAI API (or Claude, etc.)
2. Create backend endpoint: `POST /ai/insights`
   - Accepts: financial context + user prompt
   - Returns: AI-generated insights

**Frontend Changes**:
```typescript
// In AIPage.tsx - when user clicks "Analyze"
const response = await api('/ai/insights', {
  method: 'POST',
  body: JSON.stringify({
    context: aiContext,
    prompt: userPrompt
  })
});
// Display response.insights
```

**Example Prompt**:
```
Based on this financial data: {json}

Provide:
1. Financial health score (1-10)
2. Top 3 spending categories to reduce
3. Asset allocation recommendations
4. Emergency fund adequacy
5. Savings rate assessment
```

### Phase 4: Advanced Features (FUTURE)

- Historical valuation tracking
- Investment performance charts
- Spending pattern analysis
- Personalized budget recommendations
- Tax optimization suggestions
- Multi-turn conversations
- Expense categorization AI
- Savings goal planning

### Current Implementation Details

**Files Modified**:
- `src/types/api.ts` - Added AI/Valuation types
- `src/hooks/useAI.ts` - New hooks for AI endpoints
- `src/pages/AIPage.tsx` - New dedicated AI page
- `src/pages/AssetsPage.tsx` - Added Valuation section
- `src/pages/DashboardPage.tsx` - Added AI Insights card
- `src/App.tsx` - Registered `/ai` route

**Key Features**:
- ✅ Fetch `/ai/context` data (accounts, assets, transactions, categories)
- ✅ Display financial context in developer-friendly JSON viewer
- ✅ Asset valuation placeholders with "Coming Soon" status
- ✅ Responsive UI ready for real data
- ✅ Loading states and error handling
- ✅ No fake data - real API integration

**Example API Responses** (Currently Implemented):

```typescript
// GET /ai/context
{
  accounts: {
    totalAccounts: 3,
    totalBalance: 25000,
    items: [...]
  },
  assets: {
    totalAssets: 2,
    totalCostBasis: 35000,
    items: [...]
  },
  transactions: {
    totalCount: 150,
    totalIncome: 45000,
    totalExpenses: -12000,
    netCashFlow: 33000,
    categoryBreakdown: [...]
  },
  categories: {
    totalCategories: 10,
    categoryNames: [...]
  }
}

// GET /assets/valuation (Currently all null)
{
  assets: [
    {
      assetId: "guid",
      name: "Apple Stock",
      costBasisTotal: 15000,
      currentPrice: null,        // Market pricing not yet integrated
      currentValue: null,
      roiPercentage: null,
      valuationStatus: "NOT_AVAILABLE"
    }
  ],
  message: "Market pricing not enabled yet..."
}
```

### How to Integrate Phase 2 (Pricing)

1. **Update Backend** `ValuationController.GetValuation()`:
   ```csharp
   var valuationData = assets.Select(asset => {
     var pricing = await pricingService.GetPrice(asset);
     var currentValue = asset.Quantity * pricing.CurrentPrice;
     var roi = ((currentValue - asset.CostBasisTotal) / asset.CostBasisTotal) * 100;
     
     return new AssetValuationData(
       asset.Id,
       asset.Name,
       // ... other fields ...
       currentPrice: pricing.CurrentPrice,
       currentValue: currentValue,
       roiPercentage: roi,
       valuationStatus: "AVAILABLE"
     );
   });
   ```

2. **Frontend automatically updates** - no changes needed!
   - Valuation section shows real values
   - ROI displays in green/red based on sign
   - Badge changes from "Coming Soon" to "Updated Today"

### How to Integrate Phase 3 (LLM)

1. **Create Backend Endpoint**:
   ```csharp
   [HttpPost("insights")]
   public async Task<IActionResult> GenerateInsights([FromBody] InsightRequest request)
   {
     var prompt = BuildPrompt(request.Context);
     var insights = await openAiService.CompleteAsync(prompt);
     return Ok(new { insights });
   }
   ```

2. **Update AIPage.tsx**:
   ```typescript
   const response = await api('/ai/insights', {
     method: 'POST',
     body: JSON.stringify({ context: aiContext, prompt })
   });
   setInsights(response.insights);
   ```

3. **Display Results**:
   ```tsx
   <Card>
     <h3>AI Insights</h3>
     <p>{insights}</p>
   </Card>
   ```

---

## License

MIT

## API Repository

Backend API: https://github.com/zeyadelganainy/finance-tracker-api

