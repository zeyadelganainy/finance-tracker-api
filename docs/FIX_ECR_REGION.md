# Create ECR Repository in us-east-2

This script creates the ECR repository in the correct region for your App Runner service.

## Prerequisites

- AWS CLI installed and configured
- IAM user with permissions: `ecr:CreateRepository`, `ecr:DescribeRepositories`

## Run This Command

```bash
# Create ECR repository in us-east-2
aws ecr create-repository \
  --repository-name finance-tracker-api \
  --region us-east-2 \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256
```

## Verify Repository Exists

```bash
# List repositories in us-east-2
aws ecr describe-repositories \
  --region us-east-2 \
  --repository-names finance-tracker-api
```

**Expected Output**:
```json
{
  "repositories": [
    {
      "repositoryArn": "arn:aws:ecr:us-east-2:860059902575:repository/finance-tracker-api",
      "registryId": "860059902575",
      "repositoryName": "finance-tracker-api",
      "repositoryUri": "860059902575.dkr.ecr.us-east-2.amazonaws.com/finance-tracker-api",
      "createdAt": "2025-01-XX...",
      "imageTagMutability": "MUTABLE",
      "imageScanningConfiguration": {
        "scanOnPush": true
      },
      "encryptionConfiguration": {
        "encryptionType": "AES256"
      }
    }
  ]
}
```

## Clean Up Old Repository (Optional)

If you have an old repository in `us-east-1` that you want to remove:

```bash
# Delete old repository in us-east-1
aws ecr delete-repository \
  --repository-name finance-tracker-api \
  --region us-east-1 \
  --force
```

## What Changed

### Before (Broken)
- ECR repository: `us-east-1` (default region)
- App Runner service: `us-east-2`
- **Error**: Repository not found (wrong region)

### After (Fixed)
- ECR repository: `us-east-2` ?
- App Runner service: `us-east-2` ?
- **Works**: CI/CD can push images to ECR

---

## CI/CD Changes

The GitHub Actions workflow now:

1. **Configures AWS credentials** with `us-east-2`
2. **ECR login** uses `AWS_REGION=us-east-2` environment variable
3. **Docker push** goes to ECR in `us-east-2`
4. **App Runner deployment** pulls from ECR in `us-east-2`

All operations happen in the **same region** ?

---

## Next Steps

1. ? Run the ECR create command above
2. ? Push code to trigger CI/CD (already done)
3. ? Verify deployment succeeds
4. ? Test API at: https://ugwm6qnmpp.us-east-2.awsapprunner.com/health

---

## Troubleshooting

### "Repository already exists"

Good! The repository exists. Just verify it's in `us-east-2`:

```bash
aws ecr describe-repositories \
  --region us-east-2 \
  --repository-names finance-tracker-api
```

### "Access Denied"

Your IAM user needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:CreateRepository",
        "ecr:DescribeRepositories",
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    }
  ]
}
```

### CI/CD Still Fails

Check GitHub Actions logs for:
- ECR login step shows `us-east-2`
- Docker push URL contains `us-east-2`
- No more "repository does not exist" errors

---

## Summary

**Problem**: ECR repository was being looked up in `us-east-1` (default), but App Runner is in `us-east-2`

**Solution**:
1. ? Fixed CI/CD to explicitly use `us-east-2` for ECR login
2. ? Create ECR repository in `us-east-2` (run command above)
3. ? Pushed fix to GitHub

**Next**: Run the `aws ecr create-repository` command to create the repository in the correct region!
