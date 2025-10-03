# Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the chainy short URL service, with all sensitive information removed or replaced with placeholders.

## Prerequisites

### Required Tools
- AWS CLI configured with appropriate permissions
- Terraform >= 1.0
- Node.js >= 18
- npm or yarn

### AWS Resources Required
- S3 bucket for static website hosting
- DynamoDB tables for links and users
- Lambda functions for API logic
- API Gateway for HTTP API
- CloudFront distribution for CDN
- Route 53 hosted zone for DNS
- Systems Manager Parameter Store for secrets

## 1. Environment Setup

### AWS CLI Configuration
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., ap-northeast-1)
# Enter your default output format (json)
```

### Terraform Backend Configuration
```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "chainy/terraform.tfstate"
    region = "ap-northeast-1"
  }
}
```

## 2. Configuration Files

### Terraform Variables
```hcl
# terraform.tfvars
project = "chainy"
environment = "prod"
aws_region = "ap-northeast-1"

# Google OAuth Configuration
google_client_id = "your-google-client-id"
# google_client_secret = "your-google-client-secret"  # Use SSM instead
google_redirect_uri = "https://chainy.luichu.dev"

# Domain Configuration
web_domain = "luichu.dev"
web_subdomain = "chainy"
web_hosted_zone_id = "your-hosted-zone-id"

# Database Configuration
dynamodb_table_name = "chainy-prod-chainy-links"
users_table_name = "chainy-prod-chainy-users"
users_table_arn = "arn:aws:dynamodb:ap-northeast-1:account-id:table/chainy-prod-chainy-users"

# Security Configuration
jwt_secret_parameter_name = "/chainy/prod/jwt-secret"
waf_enabled = true

# Cost Optimization
cost_optimization = false
debug_mode = false
log_level = "INFO"
```

### Environment Variables
```bash
# For local development
export AWS_REGION=ap-northeast-1
export CHAINY_ENVIRONMENT=prod
export GOOGLE_CLIENT_ID=your-google-client-id
export GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 3. Secrets Management

### AWS Systems Manager Parameter Store
```bash
# Store Google client secret
aws ssm put-parameter \
  --name "/chainy/prod/google-client-secret" \
  --value "your-actual-google-client-secret" \
  --type "SecureString" \
  --description "Google OAuth Client Secret for chainy service"

# Store JWT secret
aws ssm put-parameter \
  --name "/chainy/prod/jwt-secret" \
  --value "your-jwt-secret" \
  --type "SecureString" \
  --description "JWT Secret for chainy service"
```

### IAM Permissions for SSM
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:ssm:ap-northeast-1:account-id:parameter/chainy/prod/jwt-secret",
        "arn:aws:ssm:ap-northeast-1:account-id:parameter/chainy/prod/google-client-secret"
      ]
    }
  ]
}
```

## 4. Infrastructure Deployment

### Initialize Terraform
```bash
cd /path/to/chainy
terraform init
```

### Plan Deployment
```bash
terraform plan -var-file="terraform.tfvars"
```

### Apply Infrastructure
```bash
terraform apply -var-file="terraform.tfvars"
```

### Import Existing Resources (if needed)
```bash
# Import existing S3 bucket
terraform import 'module.web[0].aws_s3_bucket.web' chainy-prod-web

# Import existing CloudFront distribution
terraform import 'module.web[0].aws_cloudfront_distribution.web' DISTRIBUTION_ID
```

## 5. Application Deployment

### Build Lambda Functions
```bash
npm install
npm run package
```

### Deploy Lambda Functions
```bash
# Deploy create function
cd dist/create
zip -r index.js.zip index.js
aws lambda update-function-code \
  --function-name chainy-prod-chainy-create \
  --zip-file fileb://index.js.zip

# Deploy redirect function
cd ../redirect
zip -r index.js.zip index.js
aws lambda update-function-code \
  --function-name chainy-prod-chainy-redirect \
  --zip-file fileb://index.js.zip

# Deploy authorizer function
cd ../authorizer
zip -r index.js.zip index.js
aws lambda update-function-code \
  --function-name chainy-prod-chainy-authorizer \
  --zip-file fileb://index.js.zip

# Deploy googleAuth function
cd ../googleAuth
zip -r index.js.zip index.js
aws lambda update-function-code \
  --function-name chainy-prod-google-auth \
  --zip-file fileb://index.js.zip
```

## 6. Frontend Deployment

### Build Frontend
```bash
cd /path/to/chainy-web
npm install
npm run build
```

### Deploy to S3
```bash
aws s3 sync dist/ s3://chainy-prod-web --delete
```

## 7. DNS Configuration

### Route 53 Configuration
```bash
# Create CNAME record for chainy.luichu.dev
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "chainy.luichu.dev",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "d3hdtwr5zmjki6.cloudfront.net"}]
      }
    }]
  }'
```

### Cloudflare Configuration (if using)
1. Add CNAME record: `chainy.luichu.dev` → `d3hdtwr5zmjki6.cloudfront.net`
2. Enable proxy (orange cloud)
3. Set SSL/TLS encryption mode to "Full"

## 8. CloudFront Configuration

### Update Distribution
```bash
# Get current distribution config
aws cloudfront get-distribution-config --id DISTRIBUTION_ID > current-config.json

# Update configuration (modify as needed)
aws cloudfront update-distribution \
  --id DISTRIBUTION_ID \
  --distribution-config file://updated-config.json \
  --if-match ETAG_VALUE
```

### Cache Invalidation
```bash
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

## 9. Testing and Validation

### API Endpoints Testing
```bash
# Test short link creation
curl -X POST "https://chainy.luichu.dev/links" \
  -H "Content-Type: application/json" \
  -d '{"target":"https://example.com"}'

# Test short link redirection
curl -I "https://chainy.luichu.dev/SHORT_CODE"

# Test user links list
curl -X GET "https://chainy.luichu.dev/links" \
  -H "Authorization: Bearer JWT_TOKEN"
```

### Google OAuth Testing
```bash
# Test Google OAuth endpoint
curl -X POST "https://chainy.luichu.dev/auth/google" \
  -H "Content-Type: application/json" \
  -d '{"code":"GOOGLE_OAUTH_CODE"}'
```

## 10. Monitoring and Logging

### CloudWatch Logs
```bash
# View Lambda function logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/chainy-prod"

# Tail logs in real-time
aws logs tail "/aws/lambda/chainy-prod-chainy-create" --follow
```

### CloudWatch Metrics
```bash
# Get CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=chainy-prod-chainy-create \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average
```

## 11. Troubleshooting

### Common Issues

#### Lambda Function Errors
```bash
# Check function configuration
aws lambda get-function --function-name chainy-prod-chainy-create

# Check function logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/chainy-prod-chainy-create" \
  --start-time $(date -d '1 hour ago' +%s)000
```

#### DynamoDB Issues
```bash
# Check table status
aws dynamodb describe-table --table-name chainy-prod-chainy-links

# Scan table contents
aws dynamodb scan --table-name chainy-prod-chainy-links --limit 10
```

#### CloudFront Issues
```bash
# Check distribution status
aws cloudfront get-distribution --id DISTRIBUTION_ID

# Check cache behavior
aws cloudfront get-distribution-config --id DISTRIBUTION_ID
```

## 12. Rollback Procedures

### Rollback Lambda Functions
```bash
# List function versions
aws lambda list-versions-by-function --function-name chainy-prod-chainy-create

# Rollback to previous version
aws lambda update-alias \
  --function-name chainy-prod-chainy-create \
  --name LIVE \
  --function-version PREVIOUS_VERSION
```

### Rollback Infrastructure
```bash
# Rollback Terraform changes
terraform plan -var-file="terraform.tfvars" -destroy
terraform apply -var-file="terraform.tfvars" -destroy
```

## 13. Maintenance and Updates

### Regular Maintenance Tasks
1. Update Lambda function code
2. Rotate secrets and certificates
3. Monitor performance and costs
4. Update dependencies
5. Review and update security policies

### Backup Procedures
```bash
# Backup DynamoDB table
aws dynamodb create-backup \
  --table-name chainy-prod-chainy-links \
  --backup-name "chainy-links-backup-$(date +%Y%m%d)"

# Backup S3 bucket
aws s3 sync s3://chainy-prod-web s3://chainy-prod-web-backup
```

## 14. Security Considerations

### Access Control
- Use IAM roles with minimal permissions
- Enable MFA for administrative access
- Regularly rotate access keys
- Monitor access logs

### Data Protection
- Enable encryption at rest and in transit
- Use secure parameter storage
- Implement proper backup procedures
- Follow data retention policies

### Network Security
- Use VPC endpoints where possible
- Implement proper security groups
- Enable WAF protection
- Monitor network traffic

## Conclusion

This deployment guide provides comprehensive instructions for deploying the chainy short URL service. Follow the steps in order, and ensure all prerequisites are met before proceeding. Regular monitoring and maintenance are essential for the continued operation of the service.

For additional support, refer to the troubleshooting documentation and security best practices guides.
