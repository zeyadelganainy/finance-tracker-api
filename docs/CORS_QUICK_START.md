# CORS Setup for Vercel Frontend - Quick Start

## ?? Quick Setup (5 minutes)

### 1. Set Environment Variable in AWS App Runner

```bash
# Go to AWS Console ? App Runner ? Your Service ? Configuration
# Add environment variable:

Name:  CORS_ALLOWED_ORIGINS
Value: https://your-vercel-domain.vercel.app
```

**For multiple origins** (comma-separated):
```bash
CORS_ALLOWED_ORIGINS=https://finance-tracker.vercel.app,https://finance-tracker-git-main.vercel.app
```

### 2. Deploy

Click **Deploy** in AWS App Runner to apply changes (~5 minutes).

### 3. Test

```sh
# Test preflight
curl -X OPTIONS https://ugwm6qnmpp.us-east-2.awsapprunner.com/accounts \
  -H "Origin: https://your-vercel-domain.vercel.app" \
  -v

# Should return 204 with Access-Control-Allow-Origin header
```

---

## What's Configured

? **CORS Policy**
- Reads from `CORS_ALLOWED_ORIGINS` environment variable
- Fallback to `appsettings.json` for local development
- Rejects wildcard (`*`) in production

? **Allowed Headers**
- `Authorization` (JWT tokens)
- `Content-Type` (JSON requests)
- `Accept` (response negotiation)

? **Allowed Methods**
- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`

? **Middleware Order**
```
CORS ? Authentication ? Authorization ? Controllers
```

? **Security**
- Production wildcard protection
- Origin validation
- Credential support for JWT

---

## Frontend Integration

### Vercel Environment Variables

Create `.env.production`:

```bash
VITE_API_BASE_URL=https://ugwm6qnmpp.us-east-2.awsapprunner.com
VITE_SUPABASE_URL=https://sltityabtomzdavnlinv.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### API Client

Ensure credentials are included:

```typescript
fetch(`${API_BASE_URL}/accounts`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important for CORS!
});
```

---

## Common Issues

### ? CORS Error Despite Configuration

**Check**:
1. Exact origin match (no trailing slash)
2. Correct protocol (`https://` not `http://`)
3. Environment variable is set in App Runner
4. Service was deployed after setting variable

### ? 401 on OPTIONS Request

**Fix**: Already handled! CORS middleware runs before authentication.

### ? Wildcard Origin Rejected

**Fix**: Use specific origins:
```bash
# Wrong
CORS_ALLOWED_ORIGINS=*

# Correct
CORS_ALLOWED_ORIGINS=https://finance-tracker.vercel.app
```

---

## Documentation

See full documentation: [`docs/CORS_CONFIGURATION.md`](./CORS_CONFIGURATION.md)

Topics covered:
- Detailed configuration options
- Security features
- Testing procedures
- Troubleshooting guide
- Vercel preview deployments

---

## Summary

Your API is now configured to support CORS requests from your Vercel frontend!

**Next Steps**:
1. Set `CORS_ALLOWED_ORIGINS` in AWS App Runner
2. Deploy the service
3. Test with `curl` or browser DevTools
4. Deploy your Vercel frontend

?? **Ready to connect your frontend!**
