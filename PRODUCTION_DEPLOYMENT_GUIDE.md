# Git Remote Integration & Production Deployment Guide

This guide covers integrating with Git remote repositories and deploying to production.

## 🚀 Current Status

### ✅ Ready for Production

- **Backend**: Lambda functions deployed and running
- **Frontend**: S3 + CloudFront deployment active
- **Domain**: https://chainy.luichu.dev is accessible (HTTP 200)
- **Security**: All sensitive data protected
- **Documentation**: Complete setup guides available

### ⚠️ Needs Configuration

- **Google OAuth**: Need to configure actual credentials in `chainy/terraform.tfvars`
- **Git Remote**: No remote repository configured yet

## 🔧 Pre-Deployment Checklist

### 1. Configure Google OAuth Credentials

```bash
# Edit local terraform configuration
nano chainy/terraform.tfvars

# Replace placeholder values with actual credentials:
google_client_id     = "your-actual-client-id"
google_client_secret = "your-actual-client-secret"
google_redirect_uri  = "https://chainy.luichu.dev"
```

### 2. Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services > Credentials
3. Update OAuth 2.0 Client ID:
   - **Authorized redirect URIs**: `https://chainy.luichu.dev`
   - **Authorized JavaScript origins**: `https://chainy.luichu.dev`

### 3. Deploy Updated Configuration

```bash
# Deploy backend with new OAuth credentials
cd chainy
terraform apply

# Verify Lambda functions are updated
aws lambda get-function-configuration --function-name chainy-prod-google-auth
```

## 🌐 Git Remote Integration

### Option 1: GitHub Integration

```bash
# Create new GitHub repository
# Then add remote:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to remote
git push -u origin main
```

### Option 2: GitLab Integration

```bash
# Create new GitLab repository
# Then add remote:
git remote add origin https://gitlab.com/YOUR_USERNAME/YOUR_REPO.git

# Push to remote
git push -u origin main
```

### Option 3: Bitbucket Integration

```bash
# Create new Bitbucket repository
# Then add remote:
git remote add origin https://bitbucket.org/YOUR_USERNAME/YOUR_REPO.git

# Push to remote
git push -u origin main
```

## 🚀 Production Deployment Steps

### 1. Final Configuration Check

```bash
# Verify all configurations
cd chainy
terraform plan

# Check if any changes needed
terraform apply
```

### 2. Frontend Deployment

```bash
# Build and deploy frontend
cd chainy-web
npm run build
aws s3 sync dist/ s3://chainy-prod-web/ --delete
aws cloudfront create-invalidation --distribution-id E1QBDOEH9EVM6M --paths "/*"
```

### 3. Production Testing

```bash
# Test production endpoints
curl https://chainy.luichu.dev
curl https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com/links

# Test Google OAuth flow
# Visit: https://chainy.luichu.dev
# Click "Sign in with Google"
# Complete OAuth flow
```

## 🔍 Production Monitoring

### 1. Check Lambda Logs

```bash
# Monitor Google Auth function
aws logs tail /aws/lambda/chainy-prod-google-auth --follow

# Monitor Create function
aws logs tail /aws/lambda/chainy-prod-chainy-create --follow
```

### 2. Check CloudWatch Metrics

```bash
# Check function invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=chainy-prod-google-auth \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### 3. Check S3 Access Logs

```bash
# Check S3 bucket access
aws s3api list-objects-v2 --bucket chainy-prod-web --max-items 10
```

## 🎯 Production Features

### ✅ Available Features

- **URL Shortening**: Create short URLs
- **Google OAuth**: Secure authentication
- **Custom Codes**: Authenticated users can create custom short codes
- **Note/Titles**: Add titles to short URLs
- **Link Management**: View, pin, and delete links
- **Analytics**: Click tracking and statistics
- **Multi-language**: English and Chinese interfaces

### 🔧 Configuration Options

- **Environment Management**: Dev/Prod configurations
- **Cost Optimization**: Production cost controls
- **Security**: WAF protection and rate limiting
- **Monitoring**: CloudWatch logs and metrics

## 🚨 Troubleshooting

### Common Issues

1. **OAuth Not Working**

   - Check Google Cloud Console configuration
   - Verify redirect URIs match
   - Check Lambda environment variables

2. **Frontend Not Loading**

   - Check S3 bucket permissions
   - Verify CloudFront distribution
   - Check domain DNS settings

3. **API Errors**
   - Check Lambda function logs
   - Verify DynamoDB permissions
   - Check API Gateway configuration

### Emergency Contacts

- **AWS Support**: Through AWS Console
- **Google Cloud Support**: Through Google Cloud Console
- **Domain Issues**: Check DNS provider

## 📊 Production Metrics

### Expected Performance

- **Response Time**: < 200ms for API calls
- **Availability**: 99.9% uptime
- **Throughput**: 1000+ requests/minute
- **Cost**: < $10/month for typical usage

### Monitoring Dashboard

- **CloudWatch Dashboard**: Available in AWS Console
- **Custom Metrics**: Click tracking and user analytics
- **Alerts**: Set up for errors and high usage

## 🎉 Go Live Checklist

- [ ] Google OAuth credentials configured
- [ ] Google Cloud Console updated
- [ ] Backend deployed with new config
- [ ] Frontend deployed and accessible
- [ ] OAuth flow tested end-to-end
- [ ] Short URL creation tested
- [ ] Link management tested
- [ ] Monitoring and alerts configured
- [ ] Team access to production systems
- [ ] Documentation updated

---

**Ready for Production**: ✅ Yes, with OAuth configuration  
**Git Remote Ready**: ✅ Yes, choose your platform  
**Monitoring Ready**: ✅ CloudWatch configured  
**Security Ready**: ✅ All sensitive data protected
