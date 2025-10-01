# 🛡️ Chainy Security Quick Reference

## 🚀 Quick Start

### 1. Deploy Security Features

```bash
# Copy configuration template
cp terraform.tfvars.example terraform.tfvars

# Edit configuration
vim terraform.tfvars

# Deploy
terraform init
terraform plan
terraform apply
```

### 2. Test Authentication

```bash
# Run production test
./test/test-production.sh

# Test JWT generation
node test/test-api.js
```

### 3. Setup Monitoring

```bash
# Setup CloudWatch alarms
./test/setup-monitoring.sh

# Setup CloudFlare (optional)
./test/setup-cloudflare.sh yourdomain.com
```

## 🔧 Common Commands

### JWT Token Management

```bash
# Get JWT secret
aws ssm get-parameter --name "/chainy/prod/jwt-secret" --with-decryption

# Generate test token
node -e "
const jwt = require('jsonwebtoken');
const payload = {userId: 'test', exp: Math.floor(Date.now()/1000) + 3600};
console.log(jwt.sign(payload, 'YOUR_SECRET'));
"
```

### API Testing

```bash
# Test authenticated endpoint
curl -X POST https://your-api-url/links \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "code": "test"}'

# Test redirect (no auth required)
curl -I https://your-api-url/test
```

### Monitoring

```bash
# Check Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `chainy-prod`)]'

# Check CloudWatch alarms
aws cloudwatch describe-alarms --alarm-names chainy-prod-lambda-errors

# Check budget status
aws budgets describe-budgets --query 'Budgets[?BudgetName==`chainy-prod-monthly-budget`]'
```

## 🚨 Troubleshooting

### Authentication Issues

```bash
# Check authorizer logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/chainy-prod-authorizer" \
  --filter-pattern "ERROR"

# Verify JWT secret
aws ssm get-parameter --name "/chainy/prod/jwt-secret" --with-decryption
```

### WAF Issues

```bash
# Check WAF logs
aws logs filter-log-events \
  --log-group-name "/aws/wafv2/chainy-prod" \
  --filter-pattern "BLOCK"

# Check WAF metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=WebACL,Value=chainy-prod-api-waf
```

### Budget Issues

```bash
# Check SNS topic
aws sns list-topics --query 'Topics[?contains(TopicArn, `chainy-prod-budget-alert`)]'

# Check budget alerts
aws budgets describe-budgets --query 'Budgets[?BudgetName==`chainy-prod-monthly-budget`].CalculatedSpend'
```

## 📊 Configuration Reference

### Terraform Variables

```hcl
# Authentication
enable_authentication = true
jwt_secret = "your-secret-key"

# WAF
enable_waf = true
waf_rate_limit_per_5min = 2000
waf_blocked_countries = ["CN", "RU"]

# Budget
enable_budget_monitoring = true
monthly_budget_limit = 50
budget_alert_emails = ["admin@yourdomain.com"]
```

### Environment Variables

```bash
# Lambda functions
CHAINY_ENVIRONMENT=prod
LOG_LEVEL=ERROR
CHAINY_TABLE_NAME=chainy-prod-chainy-links
CHAINY_EVENTS_BUCKET_NAME=chainy-prod-chainy-events
```

## 🔗 Important URLs

### AWS Console

- **API Gateway**: https://console.aws.amazon.com/apigateway/
- **Lambda**: https://console.aws.amazon.com/lambda/
- **CloudWatch**: https://console.aws.amazon.com/cloudwatch/
- **WAF**: https://console.aws.amazon.com/wafv2/
- **Budgets**: https://console.aws.amazon.com/billing/home#/budgets

### Documentation

- **JWT Integration**: `docs/jwt-integration-guide_EN.md`
- **Security Deployment**: `docs/security-deployment-guide_EN.md`
- **Cost Analysis**: `docs/waf-cost-benefit-analysis_EN.md`
- **Post Deployment**: `POST-DEPLOYMENT-GUIDE.md`

## 💰 Cost Monitoring

### Current Costs

- **Lambda**: ~$0.20/month
- **DynamoDB**: ~$0.50/month
- **S3**: ~$0.10/month
- **API Gateway**: ~$0.30/month
- **WAF**: ~$5-10/month
- **CloudWatch**: ~$1-2/month
- **Total**: ~$7-14/month

### Cost Optimization

- **CloudFlare Free**: Replace WAF (save $5-10/month)
- **Minimal Log Retention**: 1 day (save $1-2/month)
- **Budget Alerts**: Prevent overruns

## 🎯 Success Metrics

### Security Metrics

- ✅ JWT authentication working
- ✅ WAF blocking malicious requests
- ✅ Rate limiting active
- ✅ Budget monitoring enabled

### Performance Metrics

- ✅ API response time < 200ms
- ✅ Lambda cold start < 1s
- ✅ DynamoDB latency < 10ms
- ✅ Error rate < 1%

## 📞 Emergency Contacts

### AWS Support

- **Technical Support**: AWS Support Center
- **Billing Support**: AWS Billing Support
- **Documentation**: AWS Documentation

### Internal Resources

- **Logs**: CloudWatch Logs
- **Metrics**: CloudWatch Metrics
- **Alerts**: SNS Notifications
- **Tests**: `test/` directory scripts

## 🔄 Maintenance Schedule

### Daily

- Check CloudWatch alarms
- Monitor budget usage
- Review error logs

### Weekly

- Run security tests
- Check WAF metrics
- Review cost reports

### Monthly

- Update JWT secrets
- Review access logs
- Optimize costs

Your Chainy security implementation is ready for production! 🚀
