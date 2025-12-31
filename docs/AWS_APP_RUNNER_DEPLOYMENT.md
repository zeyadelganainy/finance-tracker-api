# Finance Tracker API - AWS App Runner Deployment Guide

## Overview

This guide covers deploying the Finance Tracker API to AWS App Runner using Amazon ECR (Elastic Container Registry) with a Supabase PostgreSQL database.

---

## Architecture

```
???????????????????     HTTPS      ????????????????????
?   Frontend      ? ??????????????> ?   AWS App Runner ?
?   (Web App)     ?                 ?   (Port 8080)    ?
???????????????????                 ????????????????????
                                           ?
                                           ? SSL Connection
                                           ? (sslmode=require)
                                           v
                                    ????????????????????
                                    ?   Supabase       ?
                                    ?   PostgreSQL 16  ?
                                    ????????????????????
```

---

## Prerequisites

- AWS CLI configured with appropriate credentials
- Docker installed locally
- AWS Account with ECR and App Runner access
- Supabase project with PostgreSQL database
- `.NET 9 SDK` (for local testing)

---

## Step 1: Create ECR Repository

Create a private repository in Amazon ECR to store your container images.

```bash
# Set your AWS region
export AWS_REGION=us-east-1

# Create ECR repository
aws ecr create-repository \
    --repository-name finance-tracker-api \
    --region $AWS_REGION \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256

# Save the repository URI (you'll need this)
export ECR_REPO_URI=$(aws ecr describe-repositories \
    --repository-names finance-tracker-api \
    --region $AWS_REGION \
    --query 'repositories[0].repositoryUri' \
    --output text)

echo "ECR Repository URI: $ECR_REPO_URI"
```

---

## Step 2: Build and Push Docker Image

Build the Docker image and push it to ECR.

```bash
# Navigate to the API directory
cd apps/api

# Authenticate Docker with ECR
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin $ECR_REPO_URI

# Build the Docker image
docker build -t finance-tracker-api:latest .

# Tag the image for ECR
docker tag finance-tracker-api:latest $ECR_REPO_URI:latest
docker tag finance-tracker-api:latest $ECR_REPO_URI:v1.0.0

# Push to ECR
docker push $ECR_REPO_URI:latest
docker push $ECR_REPO_URI:v1.0.0
```

---

## Step 3: Prepare Supabase Connection String

Get your Supabase connection details and format them for App Runner.

### Supabase Connection String Format

```
Host=<your-project>.supabase.co;Database=postgres;Username=postgres;Password=<your-password>;SSL Mode=Require;Trust Server Certificate=true
```

### Important Supabase Notes

1. **SSL Required**: Supabase requires SSL connections (`sslmode=require`)
2. **Direct Connections**: Use the "Direct" connection string from Supabase settings
3. **IPv6 Considerations**: App Runner supports IPv6, compatible with Supabase
4. **Port**: Default PostgreSQL port is 5432 (included in Host)

### Example Connection String

```
Host=db.abcdefghijklmnop.supabase.co;Database=postgres;Username=postgres.abcdefghijklmnop;Password=your-secure-password;SSL Mode=Require;Trust Server Certificate=true
```

**?? Security**: Never commit connection strings to version control!

---

## Step 4: Create App Runner Service

### Option A: Using AWS Console (Recommended for First Deployment)

1. **Navigate to App Runner**
   - Go to AWS Console ? App Runner
   - Click "Create service"

2. **Source Configuration**
   - **Repository type**: Container registry
   - **Provider**: Amazon ECR
   - **Container image URI**: Select your ECR image (`finance-tracker-api:latest`)
   - **Deployment trigger**: Manual

3. **Service Settings**
   - **Service name**: `finance-tracker-api`
   - **Port**: `8080`
   - **CPU**: 1 vCPU
   - **Memory**: 2 GB

4. **Environment Variables**
   ```
   Key: ASPNETCORE_ENVIRONMENT
   Value: Production

   Key: ConnectionStrings__Default
   Value: Host=db.xxxxx.supabase.co;Database=postgres;Username=postgres.xxxxx;Password=your-password;SSL Mode=Require;Trust Server Certificate=true

   Key: Cors__AllowedOrigins__0
   Value: https://your-frontend-domain.com
   ```

5. **Health Check Configuration**
   - **Protocol**: HTTP
   - **Path**: `/health`
   - **Interval**: 10 seconds
   - **Timeout**: 5 seconds
   - **Healthy threshold**: 2
   - **Unhealthy threshold**: 3

6. **Auto Scaling**
   - **Min instances**: 1
   - **Max instances**: 3
   - **Concurrency**: 100 (requests per instance)

7. **Review and Create**

### Option B: Using AWS CLI

```bash
# Create App Runner service
aws apprunner create-service \
    --service-name finance-tracker-api \
    --region $AWS_REGION \
    --source-configuration '{
        "ImageRepository": {
            "ImageIdentifier": "'$ECR_REPO_URI':latest",
            "ImageConfiguration": {
                "Port": "8080",
                "RuntimeEnvironmentVariables": {
                    "ASPNETCORE_ENVIRONMENT": "Production",
                    "ConnectionStrings__Default": "Host=db.xxxxx.supabase.co;Database=postgres;Username=postgres.xxxxx;Password=your-password;SSL Mode=Require;Trust Server Certificate=true",
                    "Cors__AllowedOrigins__0": "https://your-frontend-domain.com"
                }
            },
            "ImageRepositoryType": "ECR"
        },
        "AutoDeploymentsEnabled": false
    }' \
    --instance-configuration '{
        "Cpu": "1024",
        "Memory": "2048",
        "InstanceRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/AppRunnerECRAccessRole"
    }' \
    --health-check-configuration '{
        "Protocol": "HTTP",
        "Path": "/health",
        "Interval": 10,
        "Timeout": 5,
        "HealthyThreshold": 2,
        "UnhealthyThreshold": 3
    }' \
    --auto-scaling-configuration-arn "arn:aws:apprunner:$AWS_REGION:YOUR_ACCOUNT_ID:autoscalingconfiguration/DefaultConfiguration/1/00000000000000000000000000000001"
```

---

## Step 5: Verify Deployment

Wait for App Runner to provision the service (typically 3-5 minutes).

```bash
# Get service status
aws apprunner describe-service \
    --service-arn <your-service-arn> \
    --query 'Service.Status' \
    --output text

# Get service URL
export APP_URL=$(aws apprunner describe-service \
    --service-arn <your-service-arn> \
    --query 'Service.ServiceUrl' \
    --output text)

echo "API URL: https://$APP_URL"
```

### Test Endpoints

```bash
# Test health endpoint
curl https://$APP_URL/health

# Expected response:
# {"status":"ok"}

# Test database readiness
curl https://$APP_URL/health/ready

# Expected response:
# {"status":"ready"}

# Test API endpoint
curl https://$APP_URL/categories

# Expected response:
# [] (empty array if no categories exist)
```

---

## Step 6: Apply Database Migrations

Run EF Core migrations against your Supabase database.

```bash
# From your local machine with .NET 9 SDK
cd apps/api/FinanceTracker

# Set connection string as environment variable
export ConnectionStrings__Default="Host=db.xxxxx.supabase.co;Database=postgres;Username=postgres.xxxxx;Password=your-password;SSL Mode=Require;Trust Server Certificate=true"

# Apply migrations
dotnet ef database update

# Verify tables were created in Supabase Dashboard
# Tables: Categories, Transactions, Accounts, Assets, AccountSnapshots
```

---

## AWS App Runner Configuration Reference

### Required Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| **Port** | `8080` | App Runner requires apps to listen on port 8080 |
| **Protocol** | `HTTP` | App Runner handles HTTPS termination |
| **Health Check Path** | `/health` | Liveness probe endpoint |
| **Health Check Interval** | `10s` | Frequency of health checks |
| **Health Check Timeout** | `5s` | Maximum time for health check response |

### Environment Variables

| Variable | Example | Purpose |
|----------|---------|---------|
| `ASPNETCORE_ENVIRONMENT` | `Production` | Enables production optimizations |
| `ConnectionStrings__Default` | `Host=...` | PostgreSQL connection string |
| `Cors__AllowedOrigins__0` | `https://app.com` | CORS policy for frontend |
| `Logging__LogLevel__Default` | `Information` | (Optional) Logging level |

### Instance Configuration

| Setting | Recommended | Notes |
|---------|------------|-------|
| **CPU** | 1 vCPU (1024) | Sufficient for small-to-medium traffic |
| **Memory** | 2 GB (2048) | Handles EF Core and connection pooling |
| **Min Instances** | 1 | Always-on for quick responses |
| **Max Instances** | 3-5 | Scale based on expected traffic |
| **Concurrency** | 100 | Requests per instance |

---

## Supabase Configuration

### Required Connection Settings

```
SSL Mode: Require
Trust Server Certificate: true
Port: 5432 (default PostgreSQL)
Database: postgres
```

### Connection Pooling

Supabase provides:
- **Direct connection**: For migrations and admin tasks
- **Pooled connection**: For application traffic (use Supavisor port 6543)

**For App Runner**: Use **direct connection** in `ConnectionStrings__Default`

### IPv6 Support

App Runner supports IPv6, which is compatible with Supabase's network infrastructure. No special configuration needed.

---

## Continuous Deployment

### Automated Deployments with GitHub Actions

Create `.github/workflows/deploy-apprunner.yml`:

```yaml
name: Deploy to AWS App Runner

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: finance-tracker-api
  APP_RUNNER_SERVICE: finance-tracker-api

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v2

    - name: Build, tag, and push image to Amazon ECR
      id: build-image
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        cd apps/api
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
        echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

    - name: Deploy to App Runner
      run: |
        aws apprunner start-deployment \
          --service-arn ${{ secrets.APP_RUNNER_SERVICE_ARN }}
```

**Required GitHub Secrets**:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `APP_RUNNER_SERVICE_ARN`

---

## Monitoring and Logs

### CloudWatch Logs

App Runner automatically streams logs to CloudWatch:

```bash
# View logs
aws logs tail /aws/apprunner/finance-tracker-api/service --follow
```

### Key Metrics to Monitor

- **HTTP 2xx Response Count**: Successful requests
- **HTTP 4xx Response Count**: Client errors
- **HTTP 5xx Response Count**: Server errors
- **Request Count**: Total traffic
- **Active Instances**: Auto-scaling behavior
- **CPU Utilization**: Performance insights
- **Memory Utilization**: Memory usage patterns

### CloudWatch Alarms (Recommended)

```bash
# Create alarm for 5xx errors
aws cloudwatch put-metric-alarm \
    --alarm-name finance-tracker-api-5xx-errors \
    --alarm-description "Alert on high 5xx error rate" \
    --metric-name Http5xxCount \
    --namespace AWS/AppRunner \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 10 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=ServiceName,Value=finance-tracker-api
```

---

## Troubleshooting

### Service Won't Start

**Check logs in CloudWatch**:
```bash
aws logs tail /aws/apprunner/finance-tracker-api/service --follow
```

**Common issues**:
1. **Port mismatch**: Ensure app listens on port 8080
2. **Health check failing**: Verify `/health` endpoint returns 200
3. **Database connection**: Check Supabase connection string and SSL settings

### Health Check Failures

**Verify health endpoint locally**:
```bash
docker run -p 8080:8080 \
  -e ConnectionStrings__Default="Host=db.xxxxx.supabase.co;Database=postgres;Username=postgres.xxxxx;Password=your-password;SSL Mode=Require;Trust Server Certificate=true" \
  finance-tracker-api:latest

curl http://localhost:8080/health
```

### Database Connection Issues

**Test connection string**:
```bash
# Use psql to test connection
psql "postgresql://postgres.xxxxx:your-password@db.xxxxx.supabase.co:5432/postgres?sslmode=require"
```

**Common Supabase issues**:
1. **SSL not enabled**: Add `SSL Mode=Require`
2. **Wrong username format**: Use `postgres.xxxxx` (not just `postgres`)
3. **Firewall rules**: Supabase is public by default, no VPC needed

---

## Cost Estimation

### AWS App Runner Pricing (us-east-1)

| Component | Cost | Notes |
|-----------|------|-------|
| **Compute** | $0.064/vCPU-hour | 1 vCPU × 24h × 30d = ~$46/month |
| **Memory** | $0.007/GB-hour | 2 GB × 24h × 30d = ~$10/month |
| **Build** | $0.005/build-minute | Minimal cost for CI/CD |
| **Storage** | $0.10/GB-month | Container image storage |

**Estimated monthly cost**: ~$56-60 for always-on service with 1 instance

**Cost optimization**:
- Use auto-scaling to reduce idle instances
- Set min instances to 0 for dev/staging environments
- Use ECR lifecycle policies to clean up old images

---

## Security Best Practices

### Secrets Management

**Do NOT hardcode secrets in**:
- ? Dockerfile
- ? appsettings.json
- ? Environment variables in version control

**Use AWS Secrets Manager** (recommended for production):

```bash
# Store connection string in Secrets Manager
aws secretsmanager create-secret \
    --name finance-tracker-db-connection \
    --secret-string "Host=db.xxxxx.supabase.co;Database=postgres;Username=postgres.xxxxx;Password=your-password;SSL Mode=Require;Trust Server Certificate=true"

# Grant App Runner permission to read secret
# Update IAM role attached to App Runner service
```

### Container Security

- ? Run as non-root user (already configured in Dockerfile)
- ? Use official Microsoft base images
- ? Enable ECR image scanning
- ? Use specific image tags (not just `latest`)

### Network Security

- ? App Runner provides HTTPS by default
- ? Use CORS policy to restrict frontend origins
- ? Supabase enforces SSL connections
- ? No VPC required (Supabase is public with authentication)

---

## Rollback Procedure

If deployment fails, rollback to previous version:

```bash
# List previous image versions
aws ecr describe-images \
    --repository-name finance-tracker-api \
    --query 'sort_by(imageDetails,& imagePushedAt)[-5:]' \
    --output table

# Deploy specific version
aws apprunner update-service \
    --service-arn <your-service-arn> \
    --source-configuration '{
        "ImageRepository": {
            "ImageIdentifier": "'$ECR_REPO_URI':v1.0.0",
            "ImageConfiguration": {
                "Port": "8080"
            }
        }
    }'

# Start deployment
aws apprunner start-deployment \
    --service-arn <your-service-arn>
```

---

## Next Steps

1. ? Deploy API to App Runner
2. ? Configure custom domain (optional)
3. ? Set up monitoring and alarms
4. ? Configure auto-scaling based on traffic patterns
5. ? Implement CI/CD pipeline with GitHub Actions
6. ? Set up staging environment for testing
7. ? Configure AWS WAF for additional security (optional)

---

## Resources

- [AWS App Runner Documentation](https://docs.aws.amazon.com/apprunner/)
- [Supabase Connection Strings](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [.NET 9 Docker Images](https://hub.docker.com/_/microsoft-dotnet)
- [EF Core Migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/)

---

## Support

For issues or questions:
- **GitHub**: [zeyadelganainy/finance-tracker-api](https://github.com/zeyadelganainy/finance-tracker-api)
- **AWS Support**: Use AWS Support Center for infrastructure issues
- **Supabase Support**: Use Supabase Dashboard support chat
