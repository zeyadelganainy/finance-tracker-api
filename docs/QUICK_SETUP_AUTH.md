# Quick Setup Guide - Authentication

## ? Configuration Complete

Your Finance Tracker API is now configured with:
- **Demo User UUID**: `4960b4c0-3eb5-4df1-905e-efc6b7152dea`
- **Supabase Project**: `sltityabtomzdavnlinv.supabase.co`

---

## ?? Deployment Steps

### 1. Set Environment Variables in App Runner

Go to AWS App Runner Console and set these environment variables:

```bash
Auth__Issuer=https://sltityabtomzdavnlinv.supabase.co/auth/v1
Auth__Audience=authenticated
Auth__Secret=YOUR-SUPABASE-JWT-SECRET
Auth__DemoUserId=4960b4c0-3eb5-4df1-905e-efc6b7152dea
```

**Getting your JWT Secret**:
1. Go to Supabase Dashboard: https://app.supabase.com
2. Select your project
3. **Settings** ? **API**
4. Copy **JWT Secret** (NOT the anon or service_role keys!)
5. Paste as `Auth__Secret`

### 2. Apply Database Migration

The migration will add `UserId` columns to all tables:

```bash
# Will be applied automatically on deployment via EF Core
# Or manually run:
dotnet ef database update
```

### 3. Run Backfill Script in Supabase

This assigns all existing seeded data to the demo user:

1. Go to Supabase Dashboard ? **SQL Editor**
2. Open `supabase/backfill-demo-user.sql` from your repo
3. Copy and paste the entire script
4. Click **Run**

This will update:
- All existing Accounts
- All existing AccountSnapshots  
- All existing Assets
- All existing Categories
- All existing Transactions

All will now belong to demo user `4960b4c0-3eb5-4df1-905e-efc6b7152dea`.

### 4. Enable RLS Policies

This adds database-level security:

1. Go to Supabase Dashboard ? **SQL Editor**
2. Open `supabase/rls-policies.sql` from your repo
3. Copy and paste the entire script
4. Click **Run**

This enables Row Level Security and creates policies for:
- Accounts
- AccountSnapshots
- Assets
- Categories
- Transactions

Each table gets 4 policies (SELECT, INSERT, UPDATE, DELETE) that enforce `auth.uid() = UserId`.

---

## ?? Testing Authentication

### Test with Demo User

1. **Get Demo User Token**:
```bash
# Sign in to Supabase as demo user
curl -X POST 'https://sltityabtomzdavnlinv.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: YOUR-SUPABASE-ANON-KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "demo@financetracker.com",
    "password": "YOUR-DEMO-PASSWORD"
  }'
```

2. **Test API Endpoints**:
```bash
# Get user info
curl -H "Authorization: Bearer <access_token>" \
  https://ugwm6qnmpp.us-east-2.awsapprunner.com/auth/me

# Get accounts (should return demo user's accounts)
curl -H "Authorization: Bearer <access_token>" \
  https://ugwm6qnmpp.us-east-2.awsapprunner.com/accounts

# Should return 401 Unauthorized without token
curl https://ugwm6qnmpp.us-east-2.awsapprunner.com/accounts
```

### Expected Responses

**With valid token** (200 OK):
```json
{
  "userId": "4960b4c0-3eb5-4df1-905e-efc6b7152dea",
  "email": "demo@financetracker.com",
  "issuedAt": 1704067200,
  "expiresAt": 1704070800
}
```

**Without token** (401 Unauthorized):
```json
{
  "error": "Authorization header is missing or invalid",
  "traceId": "..."
}
```

---

## ?? Next Steps

### Apply Auth to Remaining Controllers

The authentication pattern is implemented in `AccountsController.cs`. Apply the same pattern to:

1. **AssetsController** - ? Already has `[Authorize]` stub, needs per-user scoping
2. **TransactionsController** - Needs `[Authorize]` + filtering
3. **CategoriesController** - Needs `[Authorize]` + filtering  
4. **AccountSnapshotController** - Needs `[Authorize]` + filtering
5. **AIContextController** - Needs `[Authorize]` + filtering
6. **ValuationController** - Needs `[Authorize]` + filtering

### Pattern to Apply

```csharp
[ApiController]
[Route("endpoint")]
[Authorize] // ? Add this
public class YourController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserContext _currentUser; // ? Add this

    public YourController(AppDbContext db, ICurrentUserContext currentUser)
    {
        _db = db;
        _currentUser = currentUser; // ? Add this
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var userId = Guid.Parse(_currentUser.UserId); // ? Add this

        // Filter by userId
        var items = await _db.YourTable
            .Where(x => x.UserId == userId) // ? Add this filter
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateRequest req)
    {
        var userId = Guid.Parse(_currentUser.UserId); // ? Add this

        var item = new YourEntity
        {
            UserId = userId, // ? Set from JWT, NOT from client
            // ... other properties
        };

        _db.YourTable.Add(item);
        await _db.SaveChangesAsync();
        return Created($"/endpoint/{item.Id}", item);
    }
}
```

---

## ?? Security Checklist

- [x] JWT secret configured in environment variables
- [x] Demo user UUID configured
- [x] UserId columns added to all tables
- [x] UserId indexes created
- [x] AccountsController has per-user scoping
- [x] Backfill script ready with demo UUID
- [x] RLS policies script ready
- [ ] Run backfill script in Supabase
- [ ] Enable RLS policies in Supabase
- [ ] Apply auth pattern to remaining controllers
- [ ] Test with real Supabase token

---

## ?? Documentation

See `docs/AUTHENTICATION.md` for:
- Complete architecture overview
- Detailed setup instructions
- Frontend integration examples
- Security best practices
- Troubleshooting guide

---

## ?? Troubleshooting

### "Auth:Secret is required"

Set the `Auth__Secret` environment variable in App Runner with your Supabase JWT secret.

### "User is not authenticated"

Check that:
- Token is included in `Authorization: Bearer <token>` header
- Token is not expired (check `exp` claim)
- JWT secret in API matches Supabase project

### Migration fails with "UserId cannot be null"

Run the backfill script FIRST to populate UserId for existing data, then apply the migration.

### RLS blocks all queries

Verify:
- User is authenticated (not using anon key)
- Policies were created correctly
- UserId column is populated in all tables

---

## ? Summary

**What's Configured**:
- ? Demo user UUID: `4960b4c0-3eb5-4df1-905e-efc6b7152dea`
- ? Supabase issuer: `https://sltityabtomzdavnlinv.supabase.co/auth/v1`
- ? JWT validation setup
- ? Per-user data isolation ready
- ? Backfill script ready
- ? RLS policies ready

**What's Needed**:
1. Set `Auth__Secret` in App Runner
2. Deploy (migration will run automatically)
3. Run backfill script in Supabase SQL Editor
4. Run RLS policies script in Supabase SQL Editor
5. Test with demo user token

**Your API will then enforce authentication and per-user data isolation!** ??
