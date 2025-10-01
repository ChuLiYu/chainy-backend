# 🚀 Chainy Production Environment Quick Start Guide

## 📋 Overview

Your Chainy short link service has been successfully deployed to production! This guide will help you quickly complete the follow-up setup.

## 🎯 Quick Start (5 minutes)

### 1. Test API Functionality

```bash
cd /Users/liyu/Programing/aws/chainy
./test/test-production.sh
```

### 2. Setup CloudFlare (Optional)

```bash
./test/setup-cloudflare.sh yourdomain.com
```

### 3. Setup Monitoring

```bash
./test/setup-monitoring.sh
```

## 📊 Current Status

✅ **API Endpoint**: `https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com`  
✅ **JWT Authentication**: Enabled  
✅ **Lambda Functions**: 3 functions running normally  
✅ **DynamoDB**: Table created  
✅ **S3 Bucket**: Event storage configured  
✅ **Budget Monitoring**: $10/month limit  
✅ **Cost Optimization**: WAF disabled, using CloudFlare

## 🔧 Detailed Steps

### Step 1: Test API

Run complete test suite:

```bash
./test/test-production.sh
```

Expected output:

- ✅ JWT authentication normal
- ✅ Short link creation successful
- ✅ Short link retrieval successful
- ✅ Redirect functionality normal
- ✅ Unauthenticated access protection normal

### Step 2: Setup CloudFlare

#### 2.1 Register CloudFlare Account

1. Visit [CloudFlare](https://www.cloudflare.com/)
2. Register free account
3. Verify email

#### 2.2 Add Domain

1. Log in to CloudFlare Dashboard
2. Click "Add a Site"
3. Enter your domain
4. Select **Free** plan

#### 2.3 Configure DNS Records

```
Type: CNAME
Name: api
Content: 9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com
Proxy: 🟠 Proxied

Type: CNAME
Name: r
Content: 9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com
Proxy: 🟠 Proxied
```

#### 2.4 Enable WAF Rules

1. Security → WAF
2. Enable CloudFlare Managed Ruleset
3. Create rate limiting rule:
   - 100 requests/minute
   - Apply to your domain

### Step 3: Setup Monitoring

#### 3.1 Run Monitoring Setup Script

```bash
./test/setup-monitoring.sh
```

#### 3.2 Check Budget Alerts

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Go to Billing → Budgets
3. Find `chainy-prod-monthly-budget`
4. Confirm alert settings

#### 3.3 Setup Email Notifications

1. Go to SNS → Topics
2. Find `chainy-prod-budget-alert`
3. Add your email subscription

## 🧪 Test API

### Generate JWT Token

```bash
# Get JWT secret
JWT_SECRET=$(aws ssm get-parameter --name "/chainy/prod/jwt-secret" --with-decryption --query 'Parameter.Value' --output text)

# Generate token
node -e "
const jwt = require('jsonwebtoken');
const payload = {
  userId: 'test-user-123',
  email: 'test@example.com',
  role: 'user',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
};
console.log(jwt.sign(payload, '$JWT_SECRET'));
"
```

### Test Create Short Link

```bash
curl -X POST https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com/links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "url": "https://example.com",
    "code": "test123"
  }'
```

### Test Redirect

```bash
curl -I https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com/test123
```

## 📱 Frontend Integration

### Update API Configuration

```javascript
// chainy-web/src/config/api.js
export const API_CONFIG = {
  baseURL: "https://yourdomain.com", // Or use API Gateway URL directly
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
};
```

### Deploy Frontend

```bash
cd chainy-web
npm run build
# Deploy to CloudFlare Pages or S3
```

## 💰 Cost Monitoring

### Current Budget Settings

- **Monthly Limit**: $10
- **Alerts**: 80% and 100%
- **Notifications**: Email alerts

### Estimated Monthly Costs

- **Lambda**: ~$0.20
- **DynamoDB**: ~$0.50
- **S3**: ~$0.10
- **API Gateway**: ~$0.30
- **CloudWatch**: ~$0.20
- **Total**: < $1.30

## 🚨 Troubleshooting

### Common Issues

1. **JWT Authentication Failed**

   ```bash
   # Check JWT secret
   aws ssm get-parameter --name "/chainy/prod/jwt-secret" --with-decryption
   ```

2. **API Gateway Timeout**

   ```bash
   # Check Lambda timeout settings
   aws lambda get-function-configuration --function-name chainy-prod-chainy-create
   ```

3. **DynamoDB Throttling**

   ```bash
   # Check read/write capacity
   aws dynamodb describe-table --table-name chainy-prod-chainy-links
   ```

### Check Logs

```bash
# Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/chainy-prod"

# Recent errors
aws logs filter-log-events \
  --log-group-name "/aws/lambda/chainy-prod-chainy-create" \
  --filter-pattern "ERROR"
```

## 📚 Related Documentation

- `POST-DEPLOYMENT-GUIDE.md` - Detailed follow-up steps
- `README-COST-OPTIMIZATION.md` - Cost optimization guide
- `docs/cloudflare-setup-guide_EN.md` - CloudFlare setup guide
- `SECURE-DEPLOYMENT-PLAN.md` - Secure deployment plan

## 🎉 Complete!

Your Chainy short link service now has:

- ✅ Secure production environment
- ✅ CloudFlare protection
- ✅ Cost control within budget
- ✅ Complete monitoring and alerts

## 📞 Support

If you encounter issues, please check:

- CloudWatch logs
- AWS Budgets alerts
- CloudFlare Analytics

Enjoy using it! 🚀
