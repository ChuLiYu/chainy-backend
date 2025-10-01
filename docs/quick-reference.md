# Chainy Quick Reference Guide

## 🚀 Quick Start Commands

### Environment Setup
```bash
# Check AWS configuration
aws sts get-caller-identity

# Check current region
aws configure get region

# List available regions
aws ec2 describe-regions --query 'Regions[].RegionName'
```

### Terraform Operations
```bash
# Initialize Terraform
terraform init -upgrade

# Validate configuration
terraform validate

# Plan deployment
terraform plan

# Apply changes
terraform apply

# Force unlock if needed
terraform force-unlock LOCK_ID

# Check outputs
terraform output
```

### Lambda Operations
```bash
# Build Lambda functions
npm run package

# Check Lambda function status
aws lambda get-function --function-name FUNCTION_NAME --region REGION

# Invoke Lambda function
aws lambda invoke --function-name FUNCTION_NAME --payload file://payload.json response.json

# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/"
```

### API Gateway Operations
```bash
# Get API routes
aws apigatewayv2 get-routes --api-id API_ID --region REGION

# Get API Key
aws apigateway get-api-key --api-key KEY_ID --include-value --region REGION

# Test API endpoint
curl -X POST "API_ENDPOINT" -H "x-api-key: API_KEY" -H "Content-Type: application/json" -d '{"target": "https://example.com"}'
```

### DynamoDB Operations
```bash
# Check table status
aws dynamodb describe-table --table-name TABLE_NAME --region REGION

# Get item
aws dynamodb get-item --table-name TABLE_NAME --key '{"code": {"S": "CODE"}}' --region REGION

# List tables
aws dynamodb list-tables --region REGION
```

### S3 Operations
```bash
# List buckets
aws s3 ls

# Sync files to S3
aws s3 sync dist/ s3://BUCKET_NAME --delete

# Check bucket contents
aws s3 ls s3://BUCKET_NAME
```

### CloudFront Operations
```bash
# List distributions
aws cloudfront list-distributions --query 'DistributionList.Items[].{Id:Id,DomainName:DomainName,Status:Status}'

# Get distribution details
aws cloudfront get-distribution --id DISTRIBUTION_ID
```

### Route 53 Operations
```bash
# List hosted zones
aws route53 list-hosted-zones

# List DNS records
aws route53 list-resource-record-sets --hosted-zone-id ZONE_ID

# Check DNS resolution
dig DOMAIN_NAME
nslookup DOMAIN_NAME
```

### SSL Certificate Operations
```bash
# Check certificate status
aws acm describe-certificate --certificate-arn CERTIFICATE_ARN --region us-east-1

# List certificates
aws acm list-certificates --region us-east-1
```

## 🔧 Common Troubleshooting

### API Key Issues
```bash
# Problem: Invalid API Key identifier
# Solution: Specify correct region
aws apigateway get-api-key --api-key KEY_ID --include-value --region ap-northeast-1
```

### Terraform Lock Issues
```bash
# Problem: State lock error
# Solution: Force unlock
terraform force-unlock LOCK_ID
```

### Lambda Function Issues
```bash
# Check function status
aws lambda get-function --function-name FUNCTION_NAME --region REGION

# Check logs
aws logs get-log-events --log-group-name LOG_GROUP --log-stream-name LOG_STREAM --region REGION
```

### DNS Issues
```bash
# Check DNS resolution
dig DOMAIN_NAME
nslookup DOMAIN_NAME

# Check Route 53 records
aws route53 list-resource-record-sets --hosted-zone-id ZONE_ID
```

## 📋 Current Deployment Status

### ✅ Working Components
- **API Gateway**: `https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com`
- **Lambda Functions**: create, redirect (both active)
- **DynamoDB**: `chainy-dev-chainy-links` table
- **S3 Buckets**: `chainy-dev-chainy-events`, `chainy-dev-web`
- **SSM Parameters**: Hash salts stored securely
- **API Authentication**: API Key working

### 🔄 Pending Components
- **SSL Certificate**: Pending DNS validation
- **CloudFront**: Waiting for SSL certificate
- **Custom Domain**: `chainy.luichu.dev` (pending SSL)

### 🚨 Known Issues
- **Redirect Function**: Returns 404 (investigating)
- **CloudFront Output**: Not available until SSL validation

## 🎯 Key Endpoints

### API Endpoints
- **Base URL**: `https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com`
- **Create Link**: `POST /links` (requires API Key)
- **Get Link**: `GET /links/{code}` (requires API Key)
- **Update Link**: `PUT /links/{code}` (requires API Key)
- **Delete Link**: `DELETE /links/{code}` (requires API Key)
- **Redirect**: `GET /{code}` (public, no API Key required)

### API Key
- **ID**: `c4gja270ha`
- **Value**: `CUS8ThXZox7HA9a72yAuW8DVfWth5o5lLICpZhUf`
- **Usage Plan**: `chainy-dev-chainy-http-usage-plan`

### Resource Names
- **DynamoDB Table**: `chainy-dev-chainy-links`
- **S3 Events Bucket**: `chainy-dev-chainy-events`
- **S3 Web Bucket**: `chainy-dev-web`
- **Lambda Create**: `chainy-dev-chainy-create`
- **Lambda Redirect**: `chainy-dev-chainy-redirect`
- **Route 53 Zone**: `Z06876302P1V0WLWJPIUD`

## 🔍 Monitoring Commands

### Check System Health
```bash
# Check all Lambda functions
aws lambda list-functions --region ap-northeast-1 --query 'Functions[?starts_with(FunctionName, `chainy-dev`)].{Name:FunctionName,State:State}'

# Check DynamoDB table
aws dynamodb describe-table --table-name chainy-dev-chainy-links --region ap-northeast-1 --query 'Table.{Name:TableName,Status:TableStatus,ItemCount:ItemCount}'

# Check S3 buckets
aws s3 ls | grep chainy-dev

# Check API Gateway
aws apigatewayv2 get-api --api-id 9qwxcajqf9 --region ap-northeast-1 --query 'Api.{Name:Name,ProtocolType:ProtocolType}'
```

### Performance Monitoring
```bash
# Check Lambda metrics
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Duration --dimensions Name=FunctionName,Value=chainy-dev-chainy-create --start-time 2025-09-30T00:00:00Z --end-time 2025-10-01T00:00:00Z --period 3600 --statistics Average

# Check DynamoDB metrics
aws cloudwatch get-metric-statistics --namespace AWS/DynamoDB --metric-name ConsumedReadCapacityUnits --dimensions Name=TableName,Value=chainy-dev-chainy-links --start-time 2025-09-30T00:00:00Z --end-time 2025-10-01T00:00:00Z --period 3600 --statistics Sum
```

## 📞 Emergency Contacts

### AWS Support
- **AWS Support Center**: https://console.aws.amazon.com/support/
- **Documentation**: https://docs.aws.amazon.com/

### Internal Resources
- **Terraform State**: S3 bucket `chainy-terraform-state-lui-20240930`
- **Git Repository**: Local Git repository with full history
- **Documentation**: `/docs/` directory with comprehensive guides
