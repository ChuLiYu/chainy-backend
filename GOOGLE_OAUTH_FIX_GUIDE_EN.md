# Google OAuth Fix Guide

This guide helps you resolve the "Invalid OAuth code" error that occurs when Google OAuth authentication fails.

## Problem Description

When users try to sign in with Google, they may encounter an "Invalid OAuth code" error. This typically happens when:

1. The Google Client Secret is incorrect or missing
2. The redirect URI doesn't match the configured URI in Google Cloud Console
3. The OAuth configuration is incomplete

## Root Cause Analysis

The error usually stems from one of these issues:

- **Invalid Client Secret**: The `GOOGLE_CLIENT_SECRET` environment variable contains a placeholder or incorrect value
- **Mismatched Redirect URI**: The redirect URI in the request doesn't match what's configured in Google Cloud Console
- **Expired or Invalid Code**: The authorization code has expired or is malformed

## Step-by-Step Fix

### Step 1: Check Current Configuration

First, verify your current Google OAuth configuration:

```bash
# Check Terraform variables
cat chainy/terraform.tfvars | grep google_client
```

### Step 2: Get a New Google Client Secret

Since Google no longer allows viewing the full client secret, you need to create a new one:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Navigate to OAuth Configuration**
   - Go to "APIs & Services" → "Credentials"
   - Find your OAuth 2.0 Client ID
   - Click on it to edit

3. **Create New Client Secret**
   - Click "Reset Secret" or "Create New Secret"
   - Copy the new secret immediately (it won't be shown again)

### Step 3: Update Terraform Configuration

Update your `terraform.tfvars` file with the new client secret:

```bash
# Use the provided script
./fix-google-oauth.sh

# Or manually edit terraform.tfvars
# Replace the placeholder with your actual client secret
google_client_secret = "GOCSPX-your-actual-secret-here"
```

### Step 4: Update Google Cloud Console

Ensure your Google Cloud Console configuration matches your deployment:

**Authorized Redirect URIs:**
- Development: `http://localhost:3000`
- Production: `https://chainy.luichu.dev`

**Authorized JavaScript Origins:**
- Development: `http://localhost:3000`
- Production: `https://chainy.luichu.dev`

### Step 5: Deploy Changes

Deploy the updated configuration:

```bash
# Deploy backend changes
cd chainy
terraform apply

# The Lambda function will be updated with the new client secret
```

### Step 6: Test the Fix

Test the Google OAuth flow:

1. Visit your application
2. Click "Sign in with Google"
3. Complete the OAuth flow
4. Verify you can create short URLs

## Automated Fix Script

Use the provided script to automate the fix:

```bash
# Make the script executable
chmod +x fix-google-oauth.sh

# Run the fix
./fix-google-oauth.sh
```

The script will:
1. Prompt for the new Google Client Secret
2. Update `terraform.tfvars`
3. Deploy the changes
4. Verify the fix

## Verification Steps

After applying the fix, verify everything works:

1. **Check Lambda Environment Variables**
   ```bash
   aws lambda get-function-configuration --function-name chainy-prod-chainy-create
   ```

2. **Test OAuth Flow**
   - Try signing in with Google
   - Verify you can create short URLs
   - Check that the JWT token is received

3. **Check Logs**
   ```bash
   aws logs tail /aws/lambda/chainy-prod-google-auth --follow
   ```

## Common Issues and Solutions

### Issue: "invalid_client" Error

**Cause**: Incorrect client secret
**Solution**: Generate a new client secret and update the configuration

### Issue: "redirect_uri_mismatch" Error

**Cause**: Redirect URI doesn't match Google Cloud Console configuration
**Solution**: Update the redirect URI in Google Cloud Console

### Issue: "unauthorized_client" Error

**Cause**: Client ID doesn't match or is incorrect
**Solution**: Verify the client ID in both Terraform and Google Cloud Console

## Prevention

To prevent this issue in the future:

1. **Use Environment Variables**: Store secrets in AWS Parameter Store
2. **Regular Audits**: Periodically check OAuth configuration
3. **Monitoring**: Set up alerts for authentication failures
4. **Documentation**: Keep OAuth configuration documented

## Production Considerations

For production deployments:

1. **Use AWS Parameter Store** for storing secrets
2. **Enable CloudWatch Logs** for monitoring
3. **Set up Alerts** for authentication failures
4. **Regular Security Reviews** of OAuth configuration

## Support

If you continue to experience issues:

1. Check the CloudWatch logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure Google Cloud Console configuration matches your deployment
4. Test with a fresh OAuth flow

## Migration from Chinese Documentation

This guide replaces the previous Chinese documentation (`GOOGLE_OAUTH_FIX_GUIDE.md`) with comprehensive English documentation. All functionality remains the same, but now with proper English documentation for international development teams.
