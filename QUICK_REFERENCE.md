# Finance Tracker API - Quick Reference

## Health Endpoints

| Endpoint | Purpose | Response | Use Case |
|----------|---------|----------|----------|
| `GET /health` | Liveness | `{"status":"ok"}` 200 OK | Service alive |
| `GET /health/ready` | Readiness | `{"status":"ready"}` 200 OK | DB reachable |
| `GET /health/ready` | Readiness (down) | `{"status":"not_ready"}` 503 | DB unavailable |

## Request Logging Format

```
HTTP {Method} {Path} => {StatusCode} in {Elapsed}ms TraceId={TraceId}
```

**Example:**
```
HTTP GET /transactions => 200 in 45ms TraceId=0HNI6M9P660RI
```

## Key Features

- **Liveness Probe**: `/health` - No dependencies, always available
- **Readiness Probe**: `/health/ready` - Checks database connectivity  
- **Request Logging**: Every request logged with timing and traceId
- **Environment Safe**: OpenAPI/Scalar only in Development

## Test Results

**Total Tests: 96 (all passing)**
- Original tests: 92
- Health endpoint tests: 4

## Environment Variables

```bash
# Required
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__Default="Host=...;Database=...;Username=...;Password=..."

# Optional
Logging__LogLevel__Default=Information
```

## Docker Health Check

```dockerfile
HEALTHCHECK --interval=10s --timeout=2s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

## Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Debug with TraceId

When debugging:
1. Find TraceId in logs: `TraceId=0HNI6M9P660RI`
2. Search all logs for that TraceId
3. See complete request flow and exceptions

## Files Modified

**New:**
- `FinanceTracker\Middleware\RequestLoggingMiddleware.cs`
- `FinanceTracker.Tests\HealthControllerTests.cs`

**Updated:**
- `FinanceTracker\Data\Controllers\HealthController.cs` (added `/health/ready`)
- `FinanceTracker\Program.cs` (middleware registration)

## Quick Start

```bash
# Build
dotnet build

# Test
dotnet test

# Run locally
dotnet run --project FinanceTracker

# Test health
curl http://localhost:8080/health
curl http://localhost:8080/health/ready
```

---

See DEPLOYMENT_GUIDE.md for production deployment instructions.
