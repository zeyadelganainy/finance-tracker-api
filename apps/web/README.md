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

## License

MIT

## API Repository

Backend API: https://github.com/zeyadelganainy/finance-tracker-api
