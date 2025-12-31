# Finance Tracker API - AWS App Runner Quick Deploy

## Prerequisites Checklist

- [ ] AWS CLI installed and configured
- [ ] Docker installed
- [ ] Supabase project created
- [ ] Database connection string ready
- [ ] Frontend domain (for CORS)

---

## 5-Minute Deploy

### 1. Build and Push to ECR

```bash
# Set variables
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create ECR repository
aws ecr create-repository \
    --repository-name finance-tracker-api \
    --region $AWS_REGION

# Build and push
cd apps/api
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker build -t finance-tracker-api:latest .
docker tag finance-tracker-api:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/finance-tracker-api:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/finance-tracker-api:latest
```

### 2. Create App Runner Service (Console)

1. Go to AWS App Runner Console
2. Click "Create service"
3. **Source**: ECR ? Select `finance-tracker-api:latest`
4. **Service name**: `finance-tracker-api`
5. **Port**: `8080`
6. **Environment variables**:
   ```
   ASPNETCORE_ENVIRONMENT=Production
   ConnectionStrings__Default=Host=db.xxxxx.supabase.co;Database=postgres;Username=postgres.xxxxx;Password=your-password;SSL Mode=Require;Trust Server Certificate=true
   Cors__AllowedOrigins__0=https://your-frontend.com
   ```
7. **Health check**: Path = `/health`
8. Click "Create & Deploy"

### 3. Apply Migrations

```bash
cd apps/api/FinanceTracker
export ConnectionStrings__Default="Host=db.xxxxx.supabase.co;Database=postgres;Username=postgres.xxxxx;Password=your-password;SSL Mode=Require;Trust Server Certificate=true"
dotnet ef database update
```

### 4. Verify

```bash
# Get service URL from console, then:
curl https://your-service-url.us-east-1.awsapprunner.com/health
curl https://your-service-url.us-east-1.awsapprunner.com/categories
```

---

## Environment Variables Reference

| Variable | Example Value | Required |
|----------|---------------|----------|
| `ASPNETCORE_ENVIRONMENT` | `Production` | ? |
| `ConnectionStrings__Default` | `Host=db.xxxxx.supabase.co;...` | ? |
| `Cors__AllowedOrigins__0` | `https://app.com` | ? |

---

## Supabase Connection String Template

```
Host=db.YOUR_PROJECT_REF.supabase.co;Database=postgres;Username=postgres.YOUR_PROJECT_REF;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true
```

**Find in Supabase**:
- Dashboard ? Settings ? Database ? Connection String (Direct)

---

## App Runner Configuration

| Setting | Value |
|---------|-------|
| **Port** | 8080 |
| **CPU** | 1 vCPU |
| **Memory** | 2 GB |
| **Health Check** | `/health` |
| **Min Instances** | 1 |
| **Max Instances** | 3 |

---

## Troubleshooting

### Service Won't Start
```bash
# Check logs
aws logs tail /aws/apprunner/finance-tracker-api/service --follow
```

### Health Check Failing
```bash
# Test locally
docker run -p 8080:8080 \
  -e ConnectionStrings__Default="Host=..." \
  finance-tracker-api:latest

curl http://localhost:8080/health
```

### Database Connection Error
```bash
# Test with psql
psql "postgresql://postgres.xxxxx:password@db.xxxxx.supabase.co:5432/postgres?sslmode=require"
```

---

## Cost

**Estimated monthly cost**: ~$56-60 USD
- 1 vCPU: ~$46/month
- 2 GB Memory: ~$10/month
- Always-on (1 min instance)

---

## Next Steps

- [ ] Set up custom domain
- [ ] Configure CI/CD (see `AWS_APP_RUNNER_DEPLOYMENT.md`)
- [ ] Set up CloudWatch alarms
- [ ] Configure staging environment

---

## Resources

- **Full Guide**: `docs/AWS_APP_RUNNER_DEPLOYMENT.md`
- **Dockerfile**: `apps/api/Dockerfile`
- **AWS App Runner**: https://console.aws.amazon.com/apprunner
- **Supabase**: https://app.supabase.com
