# Chainy Quick Deployment Guide

## 🚀 Deployment Steps

### 1. Set up SSM Parameters

Run the SSM parameter setup script:

```bash
./scripts/setup-ssm-parameters.sh
```

This script will:

- Check AWS CLI configuration
- Generate secure hash salts
- Create parameters in SSM Parameter Store
- Provide verification commands

### 2. Validate Terraform Configuration

```bash
terraform validate
```

### 3. Initialize Terraform

```bash
terraform init -upgrade
```

### 4. Review Deployment Plan

```bash
terraform plan
```

### 5. Deploy Infrastructure

```bash
terraform apply
```

### 6. Get API Key

After deployment, get the API Key:

```bash
terraform output -raw api_key_value
```

## 🔧 Configuration Description

### terraform.tfvars Example

```hcl
# Environment name (dev, staging, prod)
environment = "dev"

# AWS region for resources
region = "ap-northeast-1"

# SSM parameter names for hashing salts
hash_salt_parameter_name    = "/chainy/dev/hash-salt"
ip_hash_salt_parameter_name = "/chainy/dev/ip-hash-salt"

# Fallback values for SSM parameters (used if SSM fails)
hash_salt_fallback    = "your-fallback-hash-salt"
ip_hash_salt_fallback = "your-fallback-ip-salt"

# Lambda environment variables (additional)
lambda_additional_environment = {}

# Optional: Additional tags for all resources
extra_tags = {
  Project     = "chainy"
  Environment = "dev"
  ManagedBy   = "terraform"
}
```

## 🔐 Security Features

### API Authentication

- CRUD endpoints require API Key authentication
- Redirect endpoints remain public
- Rate limiting: 50 requests/second, 100 burst
- Daily quota: 10,000 requests

### SSM Parameter Management

- Hash salts stored in SSM Parameter Store
- Uses SecureString type encryption
- 5-minute cache mechanism
- Fallback to environment variables on failure

## 📊 Monitoring and Logging

### CloudWatch Logs

- Lambda function logs retained for 14 days
- Automatic log group creation
- Structured log output

### Recommended Monitoring Metrics

- Lambda error rate
- API Gateway 4XX/5XX errors
- DynamoDB read/write capacity
- S3 event storage volume

## 🧪 Testing Deployment

### 1. Test API Endpoints

```bash
# Get API endpoint
API_ENDPOINT=$(terraform output -raw api_endpoint)
API_KEY=$(terraform output -raw api_key_value)

# Test creating short link
curl -X POST "$API_ENDPOINT/links" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "code": "test123"}'

# Test redirect (no API Key required)
curl -I "$API_ENDPOINT/test123"
```

### 2. Verify SSM Parameters

```bash
aws ssm get-parameter --name "/chainy/dev/hash-salt" --with-decryption
aws ssm get-parameter --name "/chainy/dev/ip-hash-salt" --with-decryption
```

## 🔄 Updates and Maintenance

### Update Hash Salts

```bash
# Generate new salt
NEW_SALT=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# Update SSM parameter
aws ssm put-parameter \
  --name "/chainy/dev/hash-salt" \
  --value "$NEW_SALT" \
  --type "SecureString" \
  --overwrite
```

### Redeploy Lambda

```bash
# Rebuild Lambda functions
npm run build

# Redeploy
terraform apply -target=module.lambda
```

## 🚨 Troubleshooting

### Common Issues

1. **SSM Parameter Not Found**

   - Run `./scripts/setup-ssm-parameters.sh`
   - Check IAM permissions

2. **API Key Authentication Failed**

   - Verify API Key is correct
   - Check Usage Plan configuration

3. **Lambda Timeout**

   - Check SSM parameter access
   - Increase Lambda timeout

4. **DynamoDB Errors**
   - Check IAM permissions
   - Verify table exists

### Log Checking

```bash
# Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/chainy"

# API Gateway logs
aws logs describe-log-groups --log-group-name-prefix "/aws/apigateway"
```

## 📈 Performance Optimization

### Lambda Configuration

- Memory: 128MB (redirect), 256MB (create)
- Timeout: 3s (redirect), 10s (create)
- Concurrency limit: Default unlimited

### DynamoDB Configuration

- On-demand billing mode
- Auto-scaling
- Global secondary index support

### S3 Configuration

- Standard storage class
- 30-day lifecycle expiration
- Server-side encryption

## 🔒 Security Best Practices

1. **Regular API Key Rotation**
2. **Monitor Abnormal Access Patterns**
3. **Use WAF Protection**
4. **Enable CloudTrail Auditing**
5. **Regular Dependency Updates**

## 📞 Support

If you encounter issues, please check:

1. Terraform state file
2. CloudWatch logs
3. AWS service health status
4. IAM permission configuration

## 🚨 Troubleshooting Guide

### Common Deployment Issues

#### 1. Terraform State Lock Error
```bash
# Error: Error acquiring the state lock
# Solution: Force unlock
terraform force-unlock LOCK_ID
```

#### 2. API Key Region Mismatch
```bash
# Error: Invalid API Key identifier specified
# Solution: Specify correct region
aws apigateway get-api-key --api-key KEY_ID --include-value --region ap-northeast-1
```

#### 3. API Request Format Issues
```bash
# Error: Target URL is required
# Solution: Use correct field name
curl -X POST "$API_ENDPOINT/links" -d '{"target": "https://example.com"}'
```

#### 4. SSL Certificate Pending Validation
```bash
# Check certificate status
aws acm describe-certificate --certificate-arn CERTIFICATE_ARN --region us-east-1
# Wait 5-15 minutes for DNS propagation
```

#### 5. Redirect Function Returns 404
- Check DynamoDB data exists
- Verify API Gateway routes
- Check Lambda function logs
- Ensure correct region for all operations

### Debugging Commands

#### Check API Gateway Routes
```bash
aws apigatewayv2 get-routes --api-id API_ID --region ap-northeast-1
```

#### Check Lambda Function Status
```bash
aws lambda get-function --function-name FUNCTION_NAME --region ap-northeast-1
```

#### Check DynamoDB Data
```bash
aws dynamodb get-item --table-name TABLE_NAME --key '{"code": {"S": "CODE"}}' --region ap-northeast-1
```

#### Check CloudWatch Logs
```bash
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/chainy-dev" --region ap-northeast-1
```

### Current Deployment Status

#### ✅ Working Components
- **API Gateway**: `https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com`
- **Lambda Functions**: create, redirect (both active)
- **DynamoDB**: `chainy-dev-chainy-links` table
- **S3 Buckets**: `chainy-dev-chainy-events`, `chainy-dev-web`
- **SSM Parameters**: Hash salts stored securely
- **API Authentication**: API Key working

#### 🔄 Pending Components
- **SSL Certificate**: Pending DNS validation
- **CloudFront**: Waiting for SSL certificate
- **Custom Domain**: `chainy.luichu.dev` (pending SSL)

#### 🚨 Known Issues
- **Redirect Function**: Returns 404 (investigating)
- **CloudFront Output**: Not available until SSL validation

For detailed troubleshooting information, see [deployment-troubleshooting.md](./deployment-troubleshooting.md)
