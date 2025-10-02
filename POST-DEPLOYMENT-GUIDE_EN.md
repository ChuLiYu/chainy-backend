# 🚀 Chainy Production Environment Post-Deployment Guide

## 📋 Overview

Your Chainy short link service has been successfully deployed to production! This guide will help you complete the following steps to ensure the system runs normally and securely.

## 🔧 Step 1: CloudFlare Setup

### 1.1 Register CloudFlare Free Account

1. Visit [CloudFlare Official Website](https://www.cloudflare.com/)
2. Click "Sign Up" to register a free account
3. Verify your email address

### 1.2 Add Your Domain

1. Log in to CloudFlare Dashboard
2. Click "Add a Site"
3. Enter your domain (e.g., `yourdomain.com`)
4. Select **Free** plan
5. CloudFlare will scan your existing DNS records

### 1.3 Configure DNS Records

#### Method A: If You Have a Domain

```bash
# Add the following records in CloudFlare DNS settings:

# API endpoint
Type: CNAME
Name: api
Content: 9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com
Proxy status: 🟠 Proxied (orange cloud)

# Redirect endpoint
Type: CNAME
Name: r
Content: 9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com
Proxy status: 🟠 Proxied (orange cloud)
```

#### Method B: If You Don't Have a Domain

```bash
# Use AWS API Gateway endpoint directly
API endpoint: https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com
Redirect endpoint: https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com/{code}
```

### 1.4 Enable Basic WAF Rules

1. In CloudFlare Dashboard, select your domain
2. Go to **Security** → **WAF**
3. Enable the following rules:
   - **Managed Rules** → **CloudFlare Managed Ruleset** (enabled by default)
   - **Rate Limiting** → Create rule:
     ```
     Rule name: API Rate Limit
     When incoming requests match: Hostname equals "yourdomain.com"
     Then: Rate limit to 100 requests per 1 minute
     ```

## 🧪 Step 2: API Testing

### 2.1 Generate JWT Token

Create test script:

```bash
# Create test directory
mkdir -p /Users/liyu/Programing/aws/chainy/test
cd /Users/liyu/Programing/aws/chainy/test
```

```javascript
// test-jwt.js
const jwt = require("jsonwebtoken");

// Get JWT secret from SSM Parameter Store
const jwtSecret = "your-jwt-secret-here"; // Need to get from AWS

// Generate test token
const payload = {
  userId: "test-user-123",
  email: "test@example.com",
  exp: Math.floor(Date.now() / 1000) + 60 * 60, // Expires in 1 hour
};

const token = jwt.sign(payload, jwtSecret);
console.log("JWT Token:", token);
```

### 2.2 Test Authentication Endpoints

```bash
# Test creating short link
curl -X POST https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com/links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "url": "https://example.com",
    "code": "test123"
  }'
```

### 2.3 Test Redirect Functionality

```bash
# Test redirect (no authentication required)
curl -I https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com/test123
```

## 📊 Step 3: Budget Monitoring

### 3.1 Check AWS Budgets Alerts

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Go to **Billing** → **Budgets**
3. Find `chainy-prod-monthly-budget`
4. Confirm alert settings:
   - Email alert at 80%
   - Email alert at 100%

### 3.2 Monitor CloudWatch Metrics

#### Important Metrics to Monitor:

```bash
# Lambda function monitoring
- chainy-prod-chainy-create: Invocations, Errors, Duration
- chainy-prod-chainy-redirect: Invocations, Errors, Duration
- chainy-prod-authorizer: Invocations, Errors, Duration

# DynamoDB monitoring
- chainy-prod-chainy-links: ReadCapacityUnits, WriteCapacityUnits

# API Gateway monitoring
- Count, 4XXError, 5XXError, Latency
```

#### Set up CloudWatch Alarms:

1. Go to **CloudWatch** → **Alarms**
2. Create the following alarms:

   ```
   Alarm 1: Lambda Errors
   Metric: AWS/Lambda Errors
   Threshold: > 5 errors in 5 minutes

   Alarm 2: API Gateway 5XX Errors
   Metric: AWS/ApiGateway 5XXError
   Threshold: > 3 errors in 5 minutes

   Alarm 3: DynamoDB Throttling
   Metric: AWS/DynamoDB ThrottledRequests
   Threshold: > 1 throttled request in 5 minutes
   ```

## 🔍 Step 4: Deployment Verification

### 4.1 Run Complete Test Suite

```bash
cd /Users/liyu/Programing/aws/chainy

# Test JWT authentication
node test/test-jwt.js

# Test API endpoints
node test/test-api.js

# Test redirect
node test/test-redirect.js
```

### 4.2 Check Logs

```bash
# View Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/chainy-prod"

# View recent errors
aws logs filter-log-events \
  --log-group-name "/aws/lambda/chainy-prod-chainy-create" \
  --filter-pattern "ERROR"
```

## 🛠️ Step 5: Configuration Optimization

### 5.1 Adjust Lambda Configuration

```bash
# Adjust memory based on usage
aws lambda update-function-configuration \
  --function-name chainy-prod-chainy-create \
  --memory-size 512  # If processing time is long
```

### 5.2 Set up Auto Scaling

```bash
# DynamoDB auto scaling
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id table/chainy-prod-chainy-links \
  --scalable-dimension dynamodb:table:ReadCapacityUnits \
  --min-capacity 5 \
  --max-capacity 100
```

## 📱 Step 6: Frontend Integration

### 6.1 Update Frontend Configuration

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

### 6.2 Deploy Frontend

```bash
cd /Users/liyu/Programing/aws/chainy-web

# Build production version
npm run build

# Deploy to CloudFlare Pages or S3
# If using CloudFlare Pages:
# 1. Connect GitHub repository
# 2. Set build command: npm run build
# 3. Set output directory: dist
```

## 🚨 Troubleshooting

### Common Issues:

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

## 📞 Support

If you encounter issues, please check:

- CloudWatch logs
- AWS Budgets alerts
- CloudFlare Analytics

## 🎯 Next Steps

After completing these steps, your Chainy short link service will:

- ✅ Run securely in production environment
- ✅ Be protected by CloudFlare
- ✅ Have cost controlled within budget
- ✅ Have complete monitoring and alerts

## 🚀 Conclusion

Your Chainy short link service is now ready for production use! Enjoy! 🚀
