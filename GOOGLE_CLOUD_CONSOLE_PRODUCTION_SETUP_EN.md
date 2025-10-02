# Google Cloud Console Production Setup Guide

This guide walks you through setting up Google Cloud Console for production deployment of the Chainy URL shortener service.

## Overview

This guide covers the essential steps to configure Google Cloud Console for production use, including OAuth 2.0 credentials, authorized redirect URIs, and JavaScript origins.

## Prerequisites

- Google Cloud Console account
- Access to your Google Cloud project
- Production domain configured (e.g., `chainy.luichu.dev`)

## Step 1: Access Google Cloud Console

1. **Navigate to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project from the dropdown

2. **Enable Required APIs**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it
   - Search for "Google OAuth2 API" and enable it

## Step 2: Configure OAuth 2.0 Credentials

### Create OAuth 2.0 Client ID

1. **Navigate to Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"

2. **Configure Application Type**
   - Select "Web application"
   - Enter a name: "Chainy URL Shortener"

3. **Set Authorized Redirect URIs**
   ```
   https://chainy.luichu.dev
   ```

4. **Set Authorized JavaScript Origins**
   ```
   https://chainy.luichu.dev
   ```

5. **Create Credentials**
   - Click "Create"
   - Copy the Client ID and Client Secret

## Step 3: Update Terraform Configuration

Update your `terraform.tfvars` file with the production credentials:

```hcl
google_client_id     = "your-client-id.apps.googleusercontent.com"
google_client_secret = "GOCSPX-your-client-secret"
google_redirect_uri  = "https://chainy.luichu.dev"
```

## Step 4: Deploy Backend Changes

Deploy the updated configuration:

```bash
cd chainy
terraform apply
```

This will update the Lambda function environment variables with the new OAuth credentials.

## Step 5: Deploy Frontend

Deploy the frontend with production configuration:

```bash
cd chainy-web
npm run build
aws s3 sync dist/ s3://chainy-prod-web/ --delete
aws cloudfront create-invalidation --distribution-id E1QBDOEH9EVM6M --paths "/*"
```

## Step 6: Verify Configuration

### Test OAuth Flow

1. **Visit Production Site**
   - Go to https://chainy.luichu.dev
   - Click "Sign in with Google"

2. **Complete OAuth Flow**
   - Authorize the application
   - Verify you're redirected back to the site
   - Check that you can create short URLs

### Check Environment Variables

Verify the Lambda function has the correct environment variables:

```bash
aws lambda get-function-configuration --function-name chainy-prod-chainy-create
```

## Production Security Considerations

### 1. Client Secret Security

- **Never commit client secrets** to version control
- **Use AWS Parameter Store** for storing secrets
- **Rotate secrets regularly**

### 2. Redirect URI Validation

- **Use HTTPS only** for production
- **Validate redirect URIs** on the server side
- **Implement CSRF protection**

### 3. Token Security

- **Use secure JWT tokens** with proper expiration
- **Implement token refresh** mechanism
- **Store tokens securely** in the frontend

## Monitoring and Logging

### CloudWatch Logs

Monitor OAuth authentication:

```bash
# View Google Auth logs
aws logs tail /aws/lambda/chainy-prod-google-auth --follow

# View Create function logs
aws logs tail /aws/lambda/chainy-prod-chainy-create --follow
```

### Error Tracking

Set up alerts for authentication failures:

```bash
# Create CloudWatch alarm for OAuth errors
aws cloudwatch put-metric-alarm \
  --alarm-name "Google-OAuth-Errors" \
  --alarm-description "Alert on Google OAuth authentication errors" \
  --metric-name "Errors" \
  --namespace "AWS/Lambda" \
  --statistic "Sum" \
  --period 300 \
  --threshold 1 \
  --comparison-operator "GreaterThanOrEqualToThreshold"
```

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" Error**
   - **Cause**: Redirect URI doesn't match Google Cloud Console
   - **Solution**: Update authorized redirect URIs in Google Cloud Console

2. **"invalid_client" Error**
   - **Cause**: Incorrect client ID or secret
   - **Solution**: Verify credentials in both Google Cloud Console and Terraform

3. **"unauthorized_client" Error**
   - **Cause**: Client not authorized for the OAuth flow
   - **Solution**: Check OAuth consent screen configuration

### Debug Steps

1. **Check Browser Console**
   - Look for JavaScript errors
   - Verify OAuth flow parameters

2. **Check Network Tab**
   - Monitor OAuth requests
   - Verify redirect responses

3. **Check Server Logs**
   - Review Lambda function logs
   - Look for authentication errors

## Maintenance

### Regular Tasks

1. **Monitor OAuth Usage**
   - Check Google Cloud Console quotas
   - Review authentication success rates

2. **Update Dependencies**
   - Keep OAuth libraries updated
   - Review security patches

3. **Audit Configuration**
   - Verify redirect URIs
   - Check client permissions

### Security Updates

1. **Rotate Client Secrets**
   - Generate new secrets quarterly
   - Update Terraform configuration

2. **Review Permissions**
   - Audit OAuth scopes
   - Remove unnecessary permissions

## Migration from Chinese Documentation

This guide replaces the previous Chinese documentation (`GOOGLE_CLOUD_CONSOLE_PRODUCTION_SETUP.md`) with comprehensive English documentation. All functionality remains the same, but now with proper English documentation for international development teams.

## Support

For additional help:

1. **Google Cloud Console Documentation**: https://cloud.google.com/docs
2. **OAuth 2.0 Documentation**: https://developers.google.com/identity/protocols/oauth2
3. **AWS Lambda Documentation**: https://docs.aws.amazon.com/lambda/
4. **Project Issues**: Create an issue in the project repository
