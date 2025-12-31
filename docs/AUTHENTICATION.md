# Authentication & Authorization - Finance Tracker API

## Overview

The Finance Tracker API uses **Supabase Authentication** with JWT Bearer tokens for user authentication. The API validates JWTs issued by Supabase using **asymmetric cryptography (RS256)** and **JWKS (JSON Web Key Set)** for public key discovery.

**Important**: The API does **NOT** implement login functionality - authentication is handled entirely by Supabase Auth. The web app authenticates users and sends the access token to the API.

---

## Architecture

### Authentication Flow

```
1. Web App ? Supabase Auth (login with email/password)
2. Supabase ? Web App (returns access_token JWT signed with RS256)
3. Web App ? API (requests with Authorization: Bearer <access_token>)
4. API ? Fetches public keys from JWKS endpoint
5. API ? Validates JWT signature using public keys
6. API ? Returns user-specific data filtered by auth.uid()
```

### Asymmetric JWT Validation (RS256 + JWKS)

**Why Asymmetric?**
- ? **Supabase signs** tokens with a **private key** (kept secure)
- ? **API validates** tokens with **public keys** (from JWKS endpoint)
- ? **No shared secrets** to manage or rotate
- ? **Automatic key rotation** - API fetches latest keys from JWKS
- ? **Industry standard** - OpenID Connect compliance

**JWKS Endpoint**:
```
https://<PROJECT_REF>.supabase.co/auth/v1/.well-known/jwks.json
```

ASP.NET Core automatically:
1. Fetches public keys from JWKS endpoint
2. Caches keys for performance
3. Refreshes keys when they change
4. Validates JWT signatures using the correct key (by `kid` header)

### Demo Mode

The app supports a "Demo Mode" where:
- Users log into a pre-configured demo account in Supabase
- The demo account owns the seeded dataset
- The API treats the demo user like any other authenticated user
- No special handling required - just standard JWT validation

---

## Configuration

### Required Environment Variables

```bash
# Supabase Configuration (NO SECRET NEEDED!)
Auth__SupabaseUrl=https://YOUR-PROJECT.supabase.co
Auth__Issuer=https://YOUR-PROJECT.supabase.co/auth/v1
Auth__Audience=authenticated

# Demo User ID (for data seeding/backfill)
Auth__DemoUserId=uuid-of-demo-user-from-supabase
```

### What You DON'T Need

? **NO JWT Secret** - Uses JWKS public keys instead  
? **NO service_role key** - Only validates user access tokens  
? **NO manual key rotation** - Automatic via JWKS  

**?? Security Note**: Never use the `service_role` key in your API. Always use user access tokens.

---

## Implementation

### JWT Validation

The API validates:
- ? Token signature (using public key from JWKS)
- ? Issuer matches Supabase project URL
- ? Audience is "authenticated"
- ? Token expiration (`exp` claim)
- ? 5-minute clock skew tolerance

### Per-User Data Isolation

Every finance entity has a `UserId` column:
- `Accounts`
- `AccountSnapshots`
- `Assets`
- `Categories`
- `Transactions`

**Application-Level Scoping**:
- All queries filter by `UserId = auth.uid()` from JWT
- Controllers use `ICurrentUserContext` to get authenticated user ID
- **Never** accept `user_id` from client input

**Database-Level Scoping (RLS)**:
- Supabase Row Level Security (RLS) provides defense-in-depth
- Policies enforce `user_id = auth.uid()` at database level
- See `supabase/rls-policies.sql`

---

## API Endpoints

### Authentication

#### GET /auth/me

Returns current authenticated user information.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "issuedAt": 1704067200,
  "expiresAt": 1704070800
}
```

**Status Codes**:
- `200` - Success
- `401` - Unauthorized (missing/invalid token)

### Protected Endpoints

All finance endpoints require authentication:
- `GET/POST/PATCH/DELETE /accounts/**`
- `GET/POST/PATCH/DELETE /assets/**`
- `GET/POST/DELETE /transactions/**`
- `GET/POST/PATCH/DELETE /categories/**`
- `GET /ai/context`
- `GET /assets/valuation`

**Auth Header Required**:
```
Authorization: Bearer <supabase_access_token>
```

### Public Endpoints

These endpoints do **NOT** require authentication:
- `GET /health`
- `GET /health/ready`

---

## Controller Pattern

### Example: Per-User Scoping

```csharp
[ApiController]
[Route("accounts")]
[Authorize] // ? Require auth for all endpoints
public class AccountsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserContext _currentUser;

    public AccountsController(AppDbContext db, ICurrentUserContext currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var userId = Guid.Parse(_currentUser.UserId);

        // ? Always filter by authenticated user
        var accounts = await _db.Accounts
            .Where(a => a.UserId == userId)
            .ToListAsync();

        return Ok(accounts);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateAccountRequest req)
    {
        var userId = Guid.Parse(_currentUser.UserId);

        var account = new Account
        {
            UserId = userId, // ? Set from JWT, NOT from client
            Name = req.Name
        };

        _db.Accounts.Add(account);
        await _db.SaveChangesAsync();

        return Created($"/accounts/{account.Id}", account);
    }
}
```

### Key Principles

1. **Always use `ICurrentUserContext`** to get authenticated user ID
2. **Never accept `user_id` from client** - prevents privilege escalation
3. **Filter all queries by `UserId`** - prevents data leakage
4. **Add `[Authorize]` attribute** - enforces authentication

---

## Database Setup

### Step 1: Run Migration

```bash
cd apps/api/FinanceTracker
dotnet ef database update
```

This adds `UserId` columns and indexes to all tables.

### Step 2: Backfill Demo User

**Get Demo User ID**:
1. Go to Supabase Dashboard ? **Authentication** ? **Users**
2. Create a demo user (e.g., `demo@financetracker.com`)
3. Copy the user's UID

**Run Backfill Script**:
```bash
# Edit supabase/backfill-demo-user.sql
# Replace 'YOUR-DEMO-USER-UUID-HERE' with actual UUID

# Run in Supabase SQL Editor
psql $DATABASE_URL -f supabase/backfill-demo-user.sql
```

### Step 3: Enable RLS Policies

```bash
# Run in Supabase SQL Editor
psql $DATABASE_URL -f supabase/rls-policies.sql
```

---

## Row Level Security (RLS)

### Why RLS?

RLS provides **defense-in-depth**:
- Application layer validates JWT and filters queries
- Database layer enforces policies even if app has bugs
- Protects against SQL injection and logic errors

### Policy Structure

Each table has 4 policies (SELECT, INSERT, UPDATE, DELETE):

```sql
CREATE POLICY "Users can view their own accounts"
ON "Accounts"
FOR SELECT
TO authenticated
USING (auth.uid() = "UserId");
```

### Verification

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('Accounts', 'Assets', 'Transactions');

-- View policies
SELECT * FROM pg_policies 
WHERE tablename = 'Accounts';
```

---

## Frontend Integration

### Login Flow

```typescript
// 1. Sign in with Supabase
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

if (error) {
  console.error('Login failed:', error);
  return;
}

// 2. Get access token (signed with RS256 by Supabase)
const accessToken = data.session.access_token;

// 3. Call API with token (API validates with JWKS public keys)
const response = await fetch('https://api.example.com/accounts', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### Demo Mode

```typescript
// Sign in to demo account
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'demo@financetracker.com',
  password: process.env.DEMO_PASSWORD
});

// API treats demo user like any other user
// No special handling needed!
```

### Token Refresh

```typescript
// Supabase automatically refreshes tokens
// Subscribe to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    const newToken = session.access_token;
    // Update API client with new token
  }
});
```

---

## Security Best Practices

### ? DO

- Use JWT access tokens (signed by Supabase with RS256)
- Validate tokens using JWKS public keys
- Filter all queries by authenticated user ID
- Enable RLS policies for defense-in-depth
- Use HTTPS in production
- Let Supabase handle key rotation
- Set short token expiration (1 hour recommended)

### ? DON'T

- Accept `user_id` from client requests
- Use service_role key in API
- Use symmetric JWT secrets (HS256)
- Store private keys in your API
- Trust client-provided user identifiers
- Skip token validation
- Disable HTTPS for JWKS endpoint

---

## Testing

### Local Development

```bash
# 1. Set auth configuration (NO SECRET NEEDED)
export Auth__SupabaseUrl="https://your-project.supabase.co"
export Auth__Issuer="https://your-project.supabase.co/auth/v1"
export Auth__Audience="authenticated"

# 2. Run API
cd apps/api/FinanceTracker
dotnet run

# 3. Test with demo token
curl -H "Authorization: Bearer <demo_access_token>" \
  http://localhost:5000/accounts
```

### Integration Tests

Tests should mock `ICurrentUserContext`:

```csharp
public class AccountsControllerTests
{
    [Fact]
    public async Task CreateAccount_AssignsToAuthenticatedUser()
    {
        // Arrange
        var mockUser = new Mock<ICurrentUserContext>();
        mockUser.Setup(u => u.UserId).Returns("test-user-id");
        mockUser.Setup(u => u.IsAuthenticated).Returns(true);

        // Act & Assert
        // ...
    }
}
```

---

## Troubleshooting

### "Unable to obtain configuration from..."

API can't fetch JWKS from Supabase. Check:
- `Auth__Issuer` is set correctly
- API can reach Supabase URL (no firewall blocking)
- HTTPS is enabled (JWKS requires HTTPS)
- Supabase project is active

### "User is not authenticated"

- Token missing from `Authorization` header
- Token expired (check `exp` claim)
- Invalid token signature (check issuer matches)

### "Account not found" (but it exists)

- Account belongs to different user
- Check `UserId` matches token's `sub` claim

### RLS blocks queries

- Verify user has authenticated JWT (not anon key)
- Check policies are created correctly
- Confirm `UserId` column is populated

### JWKS fetch fails

- Check `Auth__Issuer` URL is correct
- Verify HTTPS is enabled
- Ensure `.well-known/jwks.json` endpoint is accessible

---

## Migration Checklist

When deploying to production:

- [ ] Set `Auth__SupabaseUrl` environment variable
- [ ] Set `Auth__Issuer` to Supabase auth URL
- [ ] Set `Auth__Audience=authenticated`
- [ ] ~~Set `Auth__Secret`~~ ? **NOT NEEDED** - Uses JWKS!
- [ ] Run EF Core migration (`dotnet ef database update`)
- [ ] Run demo user backfill script
- [ ] Enable RLS policies
- [ ] Test with real Supabase access token
- [ ] Verify JWKS endpoint is reachable
- [ ] Verify demo mode works
- [ ] Update CORS origins for production domain

---

## Summary

| Component | Implementation |
|-----------|---------------|
| **Authentication** | Supabase Auth (JWT Bearer with RS256) |
| **Key Management** | JWKS (automatic public key discovery) |
| **Authorization** | Claims-based (`[Authorize]` attribute) |
| **User Context** | `ICurrentUserContext` service |
| **Data Isolation** | Application queries + RLS policies |
| **Demo Mode** | Demo user owns seeded data |
| **Security** | Asymmetric validation + per-user filtering + RLS |

**The API uses production-grade asymmetric JWT validation with automatic key management - no secrets to manage!** ??
