# Troubleshooting & Solutions Archive

This document archives all problems encountered during development and their solutions for future reference.

## 🔍 Problem Categories

### Authentication & OAuth Issues

#### Problem: "Invalid OAuth code" Error
**Date**: 2025-10-01  
**Symptoms**: Users getting "Invalid OAuth code" error when trying to sign in with Google  
**Root Cause**: Google Client Secret was set to placeholder value in Lambda environment variables  
**Solution**: 
1. Generated new Google Client Secret from Google Cloud Console
2. Updated `terraform.tfvars` with correct secret
3. Redeployed Lambda function with `terraform apply`
4. Updated Google Cloud Console with production redirect URI

**Files Modified**:
- `chainy/terraform.tfvars` - Updated client secret
- `chainy/handlers/googleAuth.ts` - OAuth handling logic
- `fix-google-oauth.sh` - Automated fix script

**Prevention**: Use AWS Parameter Store for secrets, implement proper secret rotation

---

#### Problem: Google OAuth Redirect URI Mismatch
**Date**: 2025-10-01  
**Symptoms**: "redirect_uri_mismatch" error during OAuth flow  
**Root Cause**: Redirect URI in request didn't match Google Cloud Console configuration  
**Solution**:
1. Updated Google Cloud Console authorized redirect URIs:
   - Development: `http://localhost:3000`
   - Production: `https://chainy.luichu.dev`
2. Updated `terraform.tfvars` with production redirect URI
3. Redeployed backend configuration

**Files Modified**:
- `chainy/terraform.tfvars` - Updated redirect URI
- Google Cloud Console OAuth configuration

---

### Frontend Issues

#### Problem: Duplicate Google Login Buttons
**Date**: 2025-10-01  
**Symptoms**: Two Google login buttons causing confusion  
**Root Cause**: Multiple login implementations in frontend  
**Solution**:
1. Removed duplicate Google login button section
2. Kept single redirect-based login button
3. Updated button text to "使用 Google 登入（跳轉）"
4. Removed unused `handleRedirectLogin` function

**Files Modified**:
- `chainy-web/src/App.jsx` - Simplified login interface

---

#### Problem: Note Field Not Displaying in Link List
**Date**: 2025-10-02  
**Symptoms**: Notes saved to database but not showing in frontend  
**Root Cause**: Backend not returning `note` field in create response  
**Solution**:
1. Updated `handleCreate` function to include `note` field in response
2. Added `note` field to `ChainyLink` interface
3. Updated frontend to display notes with 📝 emoji

**Files Modified**:
- `chainy/handlers/create.ts` - Added note to response
- `chainy/lib/dynamo.ts` - Updated interface
- `chainy-web/src/App.jsx` - Added note display logic

---

### Infrastructure Issues

#### Problem: Route 53 Hosted Zone Error
**Date**: 2025-10-01  
**Symptoms**: Terraform apply failing with "couldn't find resource" for Route 53  
**Root Cause**: Placeholder `YOUR_HOSTED_ZONE_ID` in configuration  
**Solution**: Acknowledged as non-critical error, core Lambda functions deployed successfully  
**Status**: Not blocking core functionality

---

#### Problem: DNS Configuration Issues
**Date**: 2025-10-01  
**Symptoms**: Domain not resolving properly  
**Root Cause**: Missing DNS records and certificate validation  
**Solution**: 
1. Created ACM certificate for domain
2. Set up Route 53 records for domain validation
3. Configured CloudFront distribution

---

### Development Environment Issues

#### Problem: Environment Configuration Complexity
**Date**: 2025-10-01  
**Symptoms**: Difficult to manage different environments (dev/prod)  
**Root Cause**: Hardcoded values and manual configuration  
**Solution**:
1. Created `config/environments.toml` for centralized configuration
2. Implemented `env-manager.sh` for environment management
3. Created `env-switch.sh` for quick environment switching
4. Updated Vite config to load environment variables dynamically

**Files Created**:
- `config/environments.toml` - Environment configurations
- `config/env-manager.sh` - Environment management script
- `env-switch.sh` - Quick environment switching

---

### Documentation Issues

#### Problem: Mixed Language Documentation
**Date**: 2025-10-02  
**Symptoms**: Inconsistent documentation language, difficult for international teams  
**Root Cause**: Mix of Chinese and English documentation without clear organization  
**Solution**:
1. Converted all code comments to English
2. Created English versions of all documentation
3. Implemented naming convention: `_EN.md` for English, `_ZH.md` for Chinese
4. Created `DOCUMENTATION_INDEX.md` for easy navigation

**Files Created**:
- `README.md` - Main English documentation
- `ENVIRONMENT_CONFIGURATION_GUIDE_EN.md` - English environment guide
- `GOOGLE_OAUTH_FIX_GUIDE_EN.md` - English OAuth troubleshooting
- `DOCUMENTATION_INDEX.md` - Documentation index

---

## 🛠️ Common Solutions

### Google OAuth Issues
1. **Check Client Secret**: Verify it's not a placeholder value
2. **Verify Redirect URIs**: Ensure they match Google Cloud Console
3. **Check Environment Variables**: Confirm Lambda has correct values
4. **Test OAuth Flow**: Use browser developer tools to debug

### Frontend Issues
1. **Check Console Errors**: Look for JavaScript errors
2. **Verify API Calls**: Check network tab for failed requests
3. **Test Authentication**: Ensure JWT tokens are received
4. **Check CORS**: Verify cross-origin requests are allowed

### Backend Issues
1. **Check Lambda Logs**: Use CloudWatch to debug
2. **Verify Environment Variables**: Ensure all required vars are set
3. **Test API Endpoints**: Use curl or Postman to test
4. **Check DynamoDB**: Verify data is being stored correctly

### Infrastructure Issues
1. **Check Terraform State**: Ensure resources exist
2. **Verify Permissions**: Check IAM roles and policies
3. **Test DNS Resolution**: Use dig or nslookup
4. **Check Certificate Status**: Verify SSL certificates are valid

---

## 📚 Reference Materials

### Useful Commands
```bash
# Check Lambda environment variables
aws lambda get-function-configuration --function-name chainy-prod-google-auth

# View Lambda logs
aws logs tail /aws/lambda/chainy-prod-google-auth --follow

# Deploy backend
cd chainy && terraform apply

# Deploy frontend
cd chainy-web && npm run build
aws s3 sync dist/ s3://chainy-prod-web/ --delete
aws cloudfront create-invalidation --distribution-id E1QBDOEH9EVM6M --paths "/*"

# Switch environments
./env-switch.sh prod
```

### Key Files
- `chainy/terraform.tfvars` - Infrastructure configuration
- `chainy/handlers/googleAuth.ts` - OAuth handling
- `chainy-web/src/App.jsx` - Frontend main component
- `config/environments.toml` - Environment configurations

---

## 🔄 Maintenance

This archive should be updated whenever:
- New problems are encountered and solved
- Solutions are improved or updated
- New prevention measures are implemented
- Documentation is updated

**Last Updated**: 2025-10-02  
**Maintained By**: Development Team
