# AWS IAM User Setup for GitHub Actions

## 1. Create IAM User

```bash
# Create IAM user for GitHub Actions
aws iam create-user --user-name github-actions-chainy

# Create access key
aws iam create-access-key --user-name github-actions-chainy
```

## 2. Attach Required Policies

```bash
# Attach necessary policies
aws iam attach-user-policy \
  --user-name github-actions-chainy \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-user-policy \
  --user-name github-actions-chainy \
  --policy-arn arn:aws:iam::aws:policy/AmazonLambdaFullAccess

aws iam attach-user-policy \
  --user-name github-actions-chainy \
  --policy-arn arn:aws:iam::aws:policy/CloudFrontFullAccess

aws iam attach-user-policy \
  --user-name github-actions-chainy \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

aws iam attach-user-policy \
  --user-name github-actions-chainy \
  --policy-arn arn:aws:iam::aws:policy/IAMFullAccess

aws iam attach-user-policy \
  --user-name github-actions-chainy \
  --policy-arn arn:aws:iam::aws:policy/CloudFormationFullAccess
```

## 3. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Find your OAuth 2.0 Client ID
4. Copy Client ID and Client Secret
5. Update Authorized Redirect URIs:
   ```
   https://chainy.luichu.dev
   ```

## 4. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

```
AWS_ACCESS_KEY_ID: your-aws-access-key-id
AWS_SECRET_ACCESS_KEY: your-aws-secret-access-key
GOOGLE_CLIENT_ID: your-google-client-id
GOOGLE_CLIENT_SECRET: your-google-client-secret
```

## 5. Test AWS Access

```bash
# Test AWS credentials
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://chainy-prod-web/

# Test Lambda access
aws lambda list-functions --query 'Functions[?contains(FunctionName, `chainy-prod`)]'
```
