# Finance Tracker API - Production Deployment Checklist

## Pre-Deployment

### AWS Setup
- [ ] AWS Account created
- [ ] AWS CLI installed and configured
- [ ] IAM user with ECR and App Runner permissions
- [ ] AWS region selected (e.g., `us-east-1`)

### Supabase Setup
- [ ] Supabase project created
- [ ] PostgreSQL database provisioned
- [ ] Database connection string obtained
- [ ] SSL mode is set to `require`
- [ ] Connection tested with `psql` or database client

### Local Development
- [ ] .NET 9 SDK installed
- [ ] Docker Desktop installed and running
- [ ] All tests passing (`dotnet test`)
- [ ] Code committed to Git
- [ ] Repository pushed to GitHub

---

## Deployment Steps

### 1. ECR Repository Setup
- [ ] ECR repository created (`finance-tracker-api`)
- [ ] Image scanning enabled
- [ ] Repository URI saved

### 2. Docker Image Build
- [ ] Navigate to `apps/api` directory
- [ ] Dockerfile reviewed and validated
- [ ] Docker build successful
- [ ] Image tagged with version
- [ ] Image pushed to ECR

### 3. Database Migration
- [ ] Connection string environment variable set
- [ ] Migrations applied: `dotnet ef database update`
- [ ] Tables verified in Supabase dashboard:
  - [ ] Categories
  - [ ] Transactions
  - [ ] Accounts
  - [ ] Assets
  - [ ] AccountSnapshots
- [ ] Indexes created
- [ ] Constraints applied

### 4. App Runner Service Creation
- [ ] Service name: `finance-tracker-api`
- [ ] Image repository configured (ECR)
- [ ] Port set to `8080`
- [ ] Environment variables configured:
  - [ ] `ASPNETCORE_ENVIRONMENT=Production`
  - [ ] `ConnectionStrings__Default` (Supabase connection string)
  - [ ] `Cors__AllowedOrigins__0` (frontend domain)
- [ ] Instance configuration:
  - [ ] CPU: 1 vCPU (1024)
  - [ ] Memory: 2 GB (2048)
- [ ] Auto-scaling configured:
  - [ ] Min instances: 1
  - [ ] Max instances: 3
  - [ ] Concurrency: 100
- [ ] Health check configured:
  - [ ] Path: `/health`
  - [ ] Interval: 10s
  - [ ] Timeout: 5s
  - [ ] Threshold: 2/3

### 5. Service Verification
- [ ] Service status is "Running"
- [ ] Service URL obtained
- [ ] Health check endpoint tested: `GET /health`
- [ ] Readiness check tested: `GET /health/ready`
- [ ] API endpoint tested: `GET /categories`

---

## Post-Deployment

### Monitoring Setup
- [ ] CloudWatch Logs verified
- [ ] Request logs appearing in CloudWatch
- [ ] CloudWatch alarms created:
  - [ ] High 5xx error rate
  - [ ] High 4xx error rate
  - [ ] Low request count (potential downtime)
- [ ] CloudWatch dashboard created
- [ ] Metrics reviewed:
  - [ ] Request count
  - [ ] Response time
  - [ ] Error rates
  - [ ] CPU/Memory utilization

### Security Configuration
- [ ] CORS policy verified with frontend domain
- [ ] Connection string not committed to Git
- [ ] Environment variables stored securely
- [ ] ECR image scanning enabled
- [ ] Non-root user configured in container
- [ ] SSL/TLS enforced for database connection

### Performance Testing
- [ ] Load testing performed
- [ ] Response times acceptable (<500ms)
- [ ] Auto-scaling triggers tested
- [ ] Database connection pooling verified
- [ ] Memory usage monitored

### Documentation
- [ ] Service URL documented
- [ ] Environment variables documented
- [ ] Deployment process documented
- [ ] Rollback procedure documented
- [ ] Team notified of deployment

---

## CI/CD Setup (Optional but Recommended)

### GitHub Actions
- [ ] Workflow file created: `.github/workflows/deploy-apprunner.yml`
- [ ] GitHub Secrets configured:
  - [ ] `AWS_ACCESS_KEY_ID`
  - [ ] `AWS_SECRET_ACCESS_KEY`
  - [ ] `APP_RUNNER_SERVICE_ARN`
- [ ] Workflow tested with manual trigger
- [ ] Automated deployment verified on push to `main`
- [ ] Deployment notifications configured (Slack/Email)

---

## Ongoing Maintenance

### Weekly Tasks
- [ ] Review CloudWatch logs for errors
- [ ] Check CloudWatch metrics
- [ ] Monitor cost and usage
- [ ] Review security scan results

### Monthly Tasks
- [ ] Update Docker base images
- [ ] Review and update dependencies
- [ ] Clean up old ECR images
- [ ] Audit CloudWatch logs and alerts
- [ ] Review auto-scaling configuration

### As Needed
- [ ] Apply EF Core migrations for schema changes
- [ ] Update environment variables
- [ ] Scale up/down based on traffic
- [ ] Rotate database credentials
- [ ] Update CORS origins

---

## Troubleshooting Reference

### Service Won't Start
```bash
# Check CloudWatch logs
aws logs tail /aws/apprunner/finance-tracker-api/service --follow

# Common issues:
# - Port not set to 8080
# - Missing environment variables
# - Database connection string incorrect
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
# Verify connection string format
# Format: Host=db.xxxxx.supabase.co;Database=postgres;Username=postgres.xxxxx;Password=xxx;SSL Mode=Require;Trust Server Certificate=true

# Test with psql
psql "postgresql://postgres.xxxxx:password@db.xxxxx.supabase.co:5432/postgres?sslmode=require"
```

### High Error Rates
```bash
# Check application logs
aws logs tail /aws/apprunner/finance-tracker-api/application --follow

# Common issues:
# - Database connection pool exhaustion
# - EF Core query timeout
# - CORS errors (check frontend domain)
```

---

## Rollback Procedure

### Quick Rollback
```bash
# 1. Identify last working image
aws ecr describe-images \
    --repository-name finance-tracker-api \
    --query 'sort_by(imageDetails,& imagePushedAt)[-5:]'

# 2. Update service to previous image
aws apprunner update-service \
    --service-arn <arn> \
    --source-configuration '{
        "ImageRepository": {
            "ImageIdentifier": "<ecr-uri>:<previous-tag>",
            "ImageConfiguration": {"Port": "8080"}
        }
    }'

# 3. Trigger deployment
aws apprunner start-deployment --service-arn <arn>
```

### Database Rollback
```bash
# If migration causes issues, rollback to previous migration
cd apps/api/FinanceTracker
dotnet ef database update <PreviousMigrationName>
```

---

## Success Criteria

### Technical
- ? Health endpoint returns 200 OK
- ? Database connectivity verified
- ? All API endpoints responding correctly
- ? No 5xx errors in logs
- ? Response times < 500ms
- ? Auto-scaling working as expected

### Business
- ? Frontend can communicate with API
- ? User authentication working (if implemented)
- ? Data persists correctly in Supabase
- ? CORS allows frontend domain
- ? Costs within budget (~$60/month)

### Operational
- ? Monitoring and alerts configured
- ? CloudWatch logs accessible
- ? Team has access to AWS Console
- ? Rollback procedure tested
- ? CI/CD pipeline operational

---

## Contacts and Resources

### Support Channels
- **AWS Support**: AWS Console ? Support Center
- **Supabase Support**: Supabase Dashboard ? Support
- **GitHub Issues**: https://github.com/zeyadelganainy/finance-tracker-api/issues

### Documentation
- **Deployment Guide**: `docs/AWS_APP_RUNNER_DEPLOYMENT.md`
- **Quick Deploy**: `docs/QUICK_DEPLOY.md`
- **API Documentation**: `README.md`

### Useful Commands
```bash
# View logs
aws logs tail /aws/apprunner/finance-tracker-api/service --follow

# Describe service
aws apprunner describe-service --service-arn <arn>

# List deployments
aws apprunner list-operations --service-arn <arn>

# Force new deployment
aws apprunner start-deployment --service-arn <arn>
```

---

## Sign-Off

- [ ] Technical lead approval
- [ ] Security review completed
- [ ] Cost estimate approved
- [ ] Deployment window scheduled
- [ ] Stakeholders notified
- [ ] Rollback plan documented

**Deployed by**: _________________  
**Date**: _________________  
**Service ARN**: _________________  
**Service URL**: _________________  

---

## Notes

<!-- Add any deployment-specific notes here -->
