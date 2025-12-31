# Quick Setup Guide - Authentication

## ? Configuration Complete

Your Finance Tracker API is now configured with:
- **Demo User UUID**: `4960b4c0-3eb5-4df1-905e-efc6b7152dea`
- **Supabase Project**: `sltityabtomzdavnlinv.supabase.co`
- **Authentication Method**: Asymmetric JWT (RS256) with JWKS

---

## ?? Deployment Steps

### 1. Set Environment Variables in App Runner

Go to AWS App Runner Console and set these environment variables:

```bash
# Supabase Configuration (NO SECRET NEEDED!)
Auth__SupabaseUrl=https://sltityabtomzdavnlinv.supabase.co
Auth__Issuer=https://sltityabtomzdavnlinv.supabase.co/auth/v1
Auth__Audience=authenticated
Auth__DemoUserId=4960b4c0-3eb5-4df1-905e-efc6b7152dea
```

**Important Notes**:
- ? **NO JWT Secret needed** - API uses JWKS endpoint for public key discovery
- ? **NO service_role key needed** - API validates user access tokens only
- ? Signing keys are automatically fetched from: `https://sltityabtomzdavnlinv.supabase.co/auth/v1/.well-known/jwks.json`
- ? Keys are cached and refreshed automatically by ASP.NET Core

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

## ?? How JWT Validation Works

### Asymmetric Authentication (RS256 + JWKS)

The API uses **production-grade asymmetric JWT validation**:

1. **Supabase signs tokens** with a private key (RS256)
2. **API fetches public keys** from JWKS endpoint: `https://sltityabtomzdavnlinv.supabase.co/auth/v1/.well-known/jwks.json`
3. **ASP.NET Core validates** tokens using public keys
4. **Keys are cached** and automatically refreshed

**Security Benefits**:
- ? No shared secrets to manage
- ? Private keys never leave Supabase
- ? Automatic key rotation support
- ? Industry-standard OpenID Connect

### What Gets Validated

For each request with `Authorization: Bearer <token>`:
- ? **Signature** - Token was signed by Supabase (using JWKS public key)
- ? **Issuer** - Token came from `https://sltityabtomzdavnlinv.supabase.co/auth/v1`
- ? **Audience** - Token is for `authenticated` users
- ? **Expiration** - Token is not expired (`exp` claim)
- ? **Claims** - Extract `sub` (user ID), `email`, etc.

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

- [x] JWT validation configured with JWKS
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

### "Unable to obtain configuration from..."

The API is trying to fetch JWKS from Supabase. Check:
- `Auth__Issuer` is set correctly in environment variables
- Your API can reach `https://sltityabtomzdavnlinv.supabase.co` (no firewall blocking)
- HTTPS is enabled (JWKS requires HTTPS)

### "User is not authenticated"

Check that:
- Token is included in `Authorization: Bearer <token>` header
- Token is not expired (check `exp` claim)
- Token was issued by correct Supabase project

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
- ? JWT validation with JWKS (RS256 asymmetric)
- ? Automatic public key discovery and caching
- ? Per-user data isolation ready
- ? Backfill script ready
- ? RLS policies ready

**What's Needed**:
1. ~~Set `Auth__Secret` in App Runner~~ ? **NOT NEEDED** - Uses JWKS!
2. Set `Auth__SupabaseUrl` and `Auth__Issuer` in App Runner
3. Deploy (migration will run automatically)
4. Run backfill script in Supabase SQL Editor
5. Run RLS policies script in Supabase SQL Editor
6. Test with demo user token

**Your API now uses production-grade asymmetric JWT validation with automatic key management!** ??
