# Finance Tracker API - Test Your Live Deployment

## ?? Your Live API

**URL**: https://ugwm6qnmpp.us-east-2.awsapprunner.com

**Status**: ? RUNNING

---

## ? Quick Health Check

### Test in Browser

Just click these links:
1. **Health Check**: https://ugwm6qnmpp.us-east-2.awsapprunner.com/health
2. **Database Ready**: https://ugwm6qnmpp.us-east-2.awsapprunner.com/health/ready
3. **Categories**: https://ugwm6qnmpp.us-east-2.awsapprunner.com/categories

**Expected Results**:
- Health: `{"status":"ok"}`
- Ready: `{"status":"ready"}`
- Categories: `[]` (empty array before migrations)

---

## ?? Test with PowerShell

```powershell
# Set your API URL
$env:API_URL = "https://ugwm6qnmpp.us-east-2.awsapprunner.com"

# Test health endpoint
Invoke-RestMethod -Uri "$env:API_URL/health"
# Expected: @{status=ok}

# Test database readiness
Invoke-RestMethod -Uri "$env:API_URL/health/ready"
# Expected: @{status=ready}

# Test categories endpoint
Invoke-RestMethod -Uri "$env:API_URL/categories"
# Expected: [] (empty array)
```

---

## ?? Next Step: Apply Database Migrations

Your API is running, but the database tables don't exist yet!

### 1. Set Your Supabase Connection String

```powershell
# Replace with YOUR Supabase connection details
$env:ConnectionStrings__Default = "Host=db.xxxxx.supabase.co;Database=postgres;Username=postgres.xxxxx;Password=YOUR-PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
```

### 2. Navigate to Project Directory

```powershell
cd C:\FinanceTracker\apps\api\FinanceTracker
```

### 3. Apply Migrations

```powershell
dotnet ef database update
```

**Expected Output**:
```
Applying migration '20240101000001_InitialCreate'
Applying migration '20240102000001_AddAccountsAndAssets'
...
Done.
```

### 4. Verify Tables in Supabase

1. Go to: https://app.supabase.com
2. Open your project
3. Click **Table Editor** in sidebar
4. You should see:
   - ? Categories
   - ? Transactions
   - ? Accounts
   - ? Assets
   - ? AccountSnapshots

---

## ?? Test All Endpoints

### Create a Category

```powershell
$body = @{
    name = "Groceries"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$env:API_URL/categories" -Method Post -Body $body -ContentType "application/json"
```

**Expected**: `@{id=1; name=Groceries}`

### Get All Categories

```powershell
Invoke-RestMethod -Uri "$env:API_URL/categories"
```

**Expected**: Array with your new category

### Create a Transaction

```powershell
$body = @{
    amount = -50.00
    date = "2025-01-27"
    categoryId = 1
    description = "Weekly shopping"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$env:API_URL/transactions" -Method Post -Body $body -ContentType "application/json"
```

### Get Transactions

```powershell
Invoke-RestMethod -Uri "$env:API_URL/transactions"
```

### Get Monthly Summary

```powershell
Invoke-RestMethod -Uri "$env:API_URL/summary/monthly?month=2025-01"
```

---

## ?? Monitor Your API

### View CloudWatch Logs

```powershell
aws logs tail /aws/apprunner/finance-tracker-api/service --follow --region us-east-2
```

### Check Service Status

```powershell
aws apprunner describe-service --service-arn (aws apprunner list-services --region us-east-2 --query "ServiceSummaryList[?ServiceName=='finance-tracker-api'].ServiceArn" --output text) --region us-east-2 --query "Service.[Status,ServiceUrl]" --output table
```

---

## ?? Your Deployment Details

| Setting | Value |
|---------|-------|
| **URL** | https://ugwm6qnmpp.us-east-2.awsapprunner.com |
| **Region** | us-east-2 (Ohio) |
| **Status** | RUNNING ? |
| **Platform** | AWS App Runner |
| **HTTPS** | Enabled (AWS Certificate) |
| **Auto-scaling** | 1-3 instances |
| **Health Check** | /health (every 10s) |
| **Cost** | ~$60/month |

---

## ?? What You've Accomplished

? **Deployed a production .NET 9 API to AWS**  
? **Set up auto-scaling infrastructure**  
? **Configured HTTPS automatically**  
? **Created health monitoring endpoints**  
? **Integrated with Supabase PostgreSQL**  
? **Published to a public URL**  

**This is a complete production-ready deployment!** ??

---

## ?? Troubleshooting

### "Cannot resolve hostname"

**Wait 1-2 minutes for DNS to propagate**, then try again.

### Health check returns error

**Check CloudWatch logs**:
```powershell
aws logs tail /aws/apprunner/finance-tracker-api/service --follow --region us-east-2
```

### Database connection fails

**Verify your connection string**:
- Has `SSL Mode=Require;Trust Server Certificate=true`
- Username format: `postgres.xxxxx` (not just `postgres`)
- Password is correct
- Host is `db.xxxxx.supabase.co`

---

## ?? Update Your Portfolio

Add this to your resume/portfolio:

**Finance Tracker API**
- Deployed a .NET 9 REST API to AWS App Runner with auto-scaling
- Integrated PostgreSQL database with EF Core migrations
- Implemented health monitoring and structured error handling
- Set up CI/CD with GitHub Actions
- Technologies: .NET 9, ASP.NET Core, EF Core, PostgreSQL, Docker, AWS

**Live Demo**: https://ugwm6qnmpp.us-east-2.awsapprunner.com

---

## ?? Next Steps

After your API is fully working:

1. **Apply database migrations** (see above)
2. **Test all endpoints** (use scripts above)
3. **Set up CI/CD** - Automatic deployment on git push
4. **Add custom domain** - Use your own domain name
5. **Configure monitoring** - CloudWatch alarms for errors
6. **Build frontend** - Connect your web app to this API

---

**Congratulations on your first AWS deployment!** ??
