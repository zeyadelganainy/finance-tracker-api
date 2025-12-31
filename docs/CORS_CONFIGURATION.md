# CORS Configuration for Vercel Frontend

## Overview

The Finance Tracker API now supports CORS configuration via environment variables, making it easy to connect your Vercel-hosted frontend.

---

## Configuration Methods

### Method 1: Environment Variable (Recommended for Production)

Set the `CORS_ALLOWED_ORIGINS` environment variable with a comma-separated list of allowed origins:

```bash
# Single origin
CORS_ALLOWED_ORIGINS=https://finance-tracker.vercel.app

# Multiple origins (comma-separated)
CORS_ALLOWED_ORIGINS=https://finance-tracker.vercel.app,https://finance-tracker-preview.vercel.app
```

**Priority**: Environment variable takes precedence over `appsettings.json`.

### Method 2: appsettings.json (Development/Testing)

Update `appsettings.json`:

```json
{
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://finance-tracker.vercel.app"
    ]
  }
}
```

---

## AWS App Runner Configuration

### Set Environment Variable in App Runner

1. Go to **AWS App Runner Console**
2. Select your service: `finance-tracker-api`
3. Click **Configuration** ? **Configure**
4. Scroll to **Environment variables**
5. Add new variable:

```
Name:  CORS_ALLOWED_ORIGINS
Value: https://your-vercel-domain.vercel.app
```

**Example for multiple Vercel deployments**:
```
CORS_ALLOWED_ORIGINS=https://finance-tracker.vercel.app,https://finance-tracker-git-main.vercel.app
```

6. Click **Next** ? **Deploy**
7. Wait for deployment to complete (~5 minutes)

---

## CORS Policy Details

### Allowed Headers
- `Authorization` - For JWT bearer tokens
- `Content-Type` - For JSON request bodies
- `Accept` - For response content negotiation

### Allowed Methods
- `GET` - Read operations
- `POST` - Create operations
- `PUT` - Full update operations
- `PATCH` - Partial update operations
- `DELETE` - Delete operations
- `OPTIONS` - Preflight requests

### Credentials
- `AllowCredentials: true` - Allows cookies and Authorization headers

---

## Security Features

### 1. Production Wildcard Protection

The API **rejects wildcard origins (`*`) in production**:

```csharp
if (builder.Environment.IsProduction() && allowedOrigins.Contains("*"))
{
    throw new InvalidOperationException(
        "Wildcard CORS origin (*) is not allowed in production.");
}
```

**Why**: Wildcard origins disable credential support and expose your API to all domains.

### 2. Secure Default

If no origins are configured:
- All cross-origin requests are **blocked**
- API logs a warning
- Local requests (same origin) still work

### 3. Origin Validation

- Origins must be **exact matches**
- Protocol (`http` vs `https`) matters
- Port numbers matter for localhost

---

## Middleware Order

The API uses the **correct middleware order** for CORS and authentication:

```csharp
app.UseCors("AllowFrontend");        // 1. CORS (handles preflight OPTIONS)
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseAuthentication();              // 2. Authentication (validates JWT)
app.UseAuthorization();               // 3. Authorization (checks [Authorize])
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.MapControllers();                 // 4. Controller routing
```

**Why this order**:
1. **CORS first** - Handles preflight `OPTIONS` requests before authentication
2. **Auth middleware** - Validates JWT tokens
3. **Controllers** - Execute endpoint logic with authenticated user

---

## Testing CORS

### Test Preflight Request (OPTIONS)

```sh
curl -X OPTIONS https://ugwm6qnmpp.us-east-2.awsapprunner.com/accounts \
  -H "Origin: https://your-vercel-domain.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v
```

**Expected Response Headers**:
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://your-vercel-domain.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, Accept
Access-Control-Allow-Credentials: true
```

### Test Actual Request (GET)

```sh
curl https://ugwm6qnmpp.us-east-2.awsapprunner.com/accounts \
  -H "Origin: https://your-vercel-domain.vercel.app" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -v
```

**Expected Response Headers**:
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://your-vercel-domain.vercel.app
Access-Control-Allow-Credentials: true
Content-Type: application/json
```

### Test Unauthorized Request

```sh
curl https://ugwm6qnmpp.us-east-2.awsapprunner.com/accounts \
  -H "Origin: https://your-vercel-domain.vercel.app" \
  -v
```

**Expected Response**:
```
HTTP/1.1 401 Unauthorized
Access-Control-Allow-Origin: https://your-vercel-domain.vercel.app
```

**Note**: CORS headers are present even in error responses!

---

## Frontend Configuration

### Vercel Environment Variables

Create `.env.production` in your frontend:

```bash
VITE_API_BASE_URL=https://ugwm6qnmpp.us-east-2.awsapprunner.com
VITE_SUPABASE_URL=https://sltityabtomzdavnlinv.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### API Client Setup

Your API client should send credentials:

```typescript
// apps/web/src/lib/api.ts
const response = await fetch(`${API_BASE_URL}${endpoint}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include credentials for CORS
});
```

---

## Common Issues

### Issue 1: CORS Error Despite Correct Configuration

**Symptoms**:
```
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
```

**Solutions**:
1. **Check exact origin match**:
   ```bash
   # Wrong
   CORS_ALLOWED_ORIGINS=https://finance-tracker.vercel.app/
   
   # Correct (no trailing slash)
   CORS_ALLOWED_ORIGINS=https://finance-tracker.vercel.app
   ```

2. **Verify protocol**:
   ```bash
   # Wrong
   CORS_ALLOWED_ORIGINS=http://finance-tracker.vercel.app
   
   # Correct (Vercel uses HTTPS)
   CORS_ALLOWED_ORIGINS=https://finance-tracker.vercel.app
   ```

3. **Check App Runner environment variables**:
   - Go to AWS Console ? App Runner ? Configuration
   - Verify `CORS_ALLOWED_ORIGINS` is set
   - Click **Deploy** to apply changes

### Issue 2: 401 Unauthorized on Preflight

**Symptoms**:
```
OPTIONS request returns 401 Unauthorized
```

**Cause**: CORS middleware is not before Authentication middleware.

**Fix**: Already fixed in `Program.cs` - CORS is first!

### Issue 3: Wildcard Origin in Production

**Symptoms**:
```
InvalidOperationException: Wildcard CORS origin (*) is not allowed in production.
```

**Fix**: Remove `*` from allowed origins and use specific domains:
```bash
# Wrong
CORS_ALLOWED_ORIGINS=*

# Correct
CORS_ALLOWED_ORIGINS=https://finance-tracker.vercel.app
```

---

## Vercel Preview Deployments

Vercel creates preview URLs for each branch. To support them:

### Option 1: Wildcard Subdomain (Not Recommended)

```bash
CORS_ALLOWED_ORIGINS=https://*.vercel.app
```

**Problem**: This doesn't work - CORS doesn't support wildcard subdomains.

### Option 2: List All Preview URLs

```bash
CORS_ALLOWED_ORIGINS=https://finance-tracker.vercel.app,https://finance-tracker-git-main.vercel.app,https://finance-tracker-git-dev.vercel.app
```

**Problem**: Manual maintenance.

### Option 3: Dynamic CORS (Recommended)

Update `Program.cs` to allow all `*.vercel.app` origins in development:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // Development: Allow any *.vercel.app subdomain
            policy.SetIsOriginAllowed(origin => 
                origin.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase))
                  .WithHeaders("Authorization", "Content-Type", "Accept")
                  .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                  .AllowCredentials();
        }
        else
        {
            // Production: Exact match only
            policy.WithOrigins(allowedOrigins)
                  .WithHeaders("Authorization", "Content-Type", "Accept")
                  .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                  .AllowCredentials();
        }
    });
});
```

---

## Deployment Checklist

- [ ] Set `CORS_ALLOWED_ORIGINS` in AWS App Runner environment variables
- [ ] Use exact origin (no trailing slash, correct protocol)
- [ ] Deploy App Runner service
- [ ] Wait for deployment to complete
- [ ] Test preflight request with `curl`
- [ ] Test actual request with JWT token
- [ ] Verify CORS headers in browser DevTools (Network tab)
- [ ] Test from Vercel frontend

---

## Production Configuration Example

```bash
# AWS App Runner Environment Variables

# CORS
CORS_ALLOWED_ORIGINS=https://finance-tracker.vercel.app

# Authentication (already configured)
Auth__SupabaseUrl=https://sltityabtomzdavnlinv.supabase.co
Auth__Issuer=https://sltityabtomzdavnlinv.supabase.co/auth/v1
Auth__Audience=authenticated
Auth__DemoUserId=4960b4c0-3eb5-4df1-905e-efc6b7152dea

# Database (already configured)
ConnectionStrings__Default=Host=db.sltityabtomzdavnlinv.supabase.co;Database=postgres;Username=postgres;Password=***;SSL Mode=Require;Trust Server Certificate=true
```

---

## Summary

### What's Configured ?

1. **CORS policy** - Environment variable support
2. **Allowed headers** - Authorization, Content-Type, Accept
3. **Allowed methods** - GET, POST, PUT, PATCH, DELETE, OPTIONS
4. **Credentials** - Enabled for JWT authentication
5. **Middleware order** - CORS ? Auth ? Controllers
6. **Security** - Wildcard rejected in production
7. **Logging** - CORS origins logged on startup

### What You Need to Do

1. **Set environment variable in AWS App Runner**:
   ```
   CORS_ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
   ```

2. **Deploy App Runner service**

3. **Test CORS** with curl or browser DevTools

4. **Update frontend** `.env.production` with API URL

---

## Additional Resources

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [ASP.NET Core CORS](https://docs.microsoft.com/en-us/aspnet/core/security/cors)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

**Your API is now ready to support your Vercel frontend!** ??
