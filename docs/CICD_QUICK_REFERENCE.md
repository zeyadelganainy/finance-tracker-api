# CI/CD Quick Reference

## ?? GitHub Secrets Required

**Add these in**: https://github.com/zeyadelganainy/finance-tracker-api/settings/secrets/actions

Navigate: **Settings** ? **Secrets and variables** ? **Actions** ? **Repository secrets**

| Secret Name | Value | How to Get |
|-------------|-------|-----------|
| `AWS_ACCESS_KEY_ID` | `AKIAIOSFODNN7...` | IAM ? Users ? Create access key |
| `AWS_SECRET_ACCESS_KEY` | `wJalrXUtnFEMI...` | Same as above (shown once) |
| `APP_RUNNER_SERVICE_ARN` | `arn:aws:apprunner:...` | See command below |

**?? Step-by-step guide**: `docs/ADD_GITHUB_SECRETS.md`

---

## ?? Create IAM User (One-Time Setup)

### Via AWS Console:

1. **IAM** ? **Users** ? **Create user**
2. Name: `github-actions-finance-tracker`
3. **Permissions**: Attach policies directly
4. Add policies:
   - ? `AmazonEC2ContainerRegistryPowerUser`
   - ? `AppRunnerFullAccess`
5. **Create user**

### Create Access Key:

1. Click on the user
2. **Security credentials** tab
3. **Create access key**
4. Purpose: **"Application running outside AWS"**
5. **?? COPY BOTH VALUES** (secret shown once only!)

---

## ?? Get App Runner Service ARN

```powershell
aws apprunner list-services --region us-east-2 --query "ServiceSummaryList[?ServiceName=='finance-tracker-api'].ServiceArn" --output text
```

**Expected output**:
```
arn:aws:apprunner:us-east-2:123456789012:service/finance-tracker-api/abcd1234
```

---

## ? Test CI/CD

After adding all 3 secrets:

```powershell
# Make a change and push
cd C:\FinanceTracker
echo "" >> README.md
git add README.md
git commit -m "test: Trigger CI/CD"
git push origin main

# Watch deployment at:
# https://github.com/zeyadelganainy/finance-tracker-api/actions
```

---

## ?? Workflow Triggers

| Event | Runs Tests? | Deploys? |
|-------|------------|----------|
| Push to `main` | ? | ? |
| Pull Request | ? | ? |
| Push to other branch | ? | ? |

---

## ?? Deployment Flow

```
Push to main
  ?
Run 96 tests
  ?
Build Docker image
  ?
Push to ECR
  ?
Deploy to App Runner
  ?
Health check /health
  ?
? Live at: https://ugwm6qnmpp.us-east-2.awsapprunner.com
```

**Time**: ~8-12 minutes

---

## ?? Monitor Deployments

**GitHub Actions**:
```
https://github.com/zeyadelganainy/finance-tracker-api/actions
```

**CloudWatch Logs**:
```powershell
aws logs tail /aws/apprunner/finance-tracker-api/service --follow --region us-east-2
```

**App Runner Console**:
```
AWS Console ? App Runner ? finance-tracker-api ? Deployments
```

---

## ?? Quick Fixes

### Tests Fail
```powershell
# Run tests locally first
cd apps/api
dotnet test
```

### Deployment Fails
```powershell
# Check secrets are set correctly
# GitHub ? Settings ? Secrets and variables ? Actions

# Verify IAM permissions
# AWS Console ? IAM ? Users ? github-actions-finance-tracker
```

### Health Check Fails
```powershell
# Check App Runner status
aws apprunner describe-service --service-arn <arn> --region us-east-2 --query "Service.Status"

# Check logs
aws logs tail /aws/apprunner/finance-tracker-api/service --follow --region us-east-2
```

---

## ?? Common Commands

### Trigger Manual Deployment
```powershell
# Via GitHub Actions UI
# Go to Actions ? CI ? Run workflow ? Select branch

# Or push empty commit
git commit --allow-empty -m "deploy: Trigger deployment"
git push origin main
```

### Rollback to Previous Version
```powershell
# List recent images
aws ecr describe-images --repository-name finance-tracker-api --region us-east-2 --query 'sort_by(imageDetails,& imagePushedAt)[-5:]'

# Update service
aws apprunner update-service --service-arn <arn> --source-configuration '{"ImageRepository":{"ImageIdentifier":"<previous-image>","ImageConfiguration":{"Port":"8080"}}}' --region us-east-2
```

### View Recent Deployments
```powershell
# GitHub
# https://github.com/zeyadelganainy/finance-tracker-api/deployments

# AWS CLI
aws apprunner list-operations --service-arn <arn> --region us-east-2 --max-results 10
```

---

## ?? Success Metrics

| Metric | Target |
|--------|--------|
| Test Pass Rate | 100% (96/96 tests) |
| Build Time | < 5 minutes |
| Deployment Time | < 8 minutes |
| Health Check | ? 200 OK |
| Uptime | > 99.9% |

---

## ?? Resources

- **Add Secrets Guide**: `docs/ADD_GITHUB_SECRETS.md`
- **Full Setup Guide**: `docs/CICD_SETUP_GUIDE.md`
- **GitHub Actions**: https://github.com/zeyadelganainy/finance-tracker-api/actions
- **AWS Console**: https://console.aws.amazon.com/apprunner/
- **Live API**: https://ugwm6qnmpp.us-east-2.awsapprunner.com

---

## ? Setup Checklist

- [ ] IAM user created (`github-actions-finance-tracker`)
- [ ] Two policies attached (ECR PowerUser + App Runner Full Access)
- [ ] Access key created and copied
- [ ] All 3 GitHub secrets added
- [ ] Test push to `main` successful
- [ ] Deployment completed
- [ ] Health check passed
- [ ] Live API accessible

**Status**: See https://github.com/zeyadelganainy/finance-tracker-api/actions
