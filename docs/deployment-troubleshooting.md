# Chainy Deployment Troubleshooting Guide

## 🚀 Deployment Status Summary

### ✅ Successfully Deployed Components

#### Backend Infrastructure
- **API Gateway**: `https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com`
- **Lambda Functions**: Both create and redirect functions deployed and running
- **DynamoDB Table**: `chainy-dev-chainy-links` created successfully
- **S3 Event Storage**: `chainy-dev-chainy-events` bucket created
- **SSM Parameters**: Hash salts securely stored
- **API Authentication**: API Key created and tested successfully

#### Frontend Infrastructure
- **React Application**: Successfully built and deployed
- **S3 Static Hosting**: Files uploaded to `chainy-dev-web` bucket
- **Static Assets**: HTML, CSS, JS files deployed

#### API Testing Results
- **Create Short Link**: ✅ Successfully created short link `RfORZ0V`
- **API Authentication**: ✅ API Key authentication working correctly
- **Data Storage**: ✅ Short link stored in DynamoDB

### 🔄 In Progress Components

#### Custom Domain Configuration
- **Route 53**: ✅ Hosted Zone created (`Z06876302P1V0WLWJPIUD`)
- **SSL Certificate**: 🔄 Pending DNS validation
- **CloudFront Distribution**: 🔄 Waiting for SSL certificate validation
- **DNS Records**: ✅ Validation records created

## 🚨 Known Issues and Solutions

### Issue 1: Terraform State Lock

**Problem**: Terraform state was locked during deployment
```
Error acquiring the state lock
Lock Info:
  ID: 5443b50d-e20d-a345-6708-2a0c8fd3f768
```

**Solution**:
```bash
terraform force-unlock 5443b50d-e20d-a345-6708-2a0c8fd3f768
```

**Prevention**: Always ensure previous Terraform operations complete before starting new ones.

### Issue 2: API Key Region Mismatch

**Problem**: API Key retrieval failed with "Invalid API Key identifier"
```bash
aws apigateway get-api-key --api-key c4gja270ha --include-value
# Error: Invalid API Key identifier specified
```

**Root Cause**: API Gateway resources are region-specific, but we were querying from wrong region.

**Solution**:
```bash
# Specify correct region
aws apigateway get-api-key --api-key c4gja270ha --include-value --region ap-northeast-1
```

**Key Learning**: Always specify the correct AWS region when working with regional services.

### Issue 3: API Request Format Issues

**Problem**: API requests returned "Target URL is required" error
```bash
curl -X POST "$API_ENDPOINT/links" -d '{"url": "https://example.com"}'
# Response: {"message":"Target URL is required"}
```

**Root Cause**: API expects `target` field, not `url` or `target_url`.

**Solution**:
```bash
curl -X POST "$API_ENDPOINT/links" -d '{"target": "https://example.com"}'
# Response: {"code":"RfORZ0V","target":"https://example.com",...}
```

**Key Learning**: Always check API documentation or source code for correct field names.

### Issue 4: Redirect Function Not Working

**Problem**: Short link redirects return 404 even though data exists in DynamoDB
```bash
curl -I "https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com/RfORZ0V"
# Response: HTTP/2 404
```

**Investigation Results**:
- ✅ Short link exists in DynamoDB
- ✅ Lambda function is active and deployed
- ✅ API Gateway routes configured correctly
- ✅ Lambda permissions are correct
- ✅ CloudWatch logs show function invocations

**Status**: Still investigating. Possible causes:
1. Lambda function logic issue
2. API Gateway routing configuration
3. DynamoDB query parameters

### Issue 5: CloudFront Distribution Not Available

**Problem**: CloudFront distribution not showing in outputs
```bash
terraform output web_cloudfront_domain
# Error: Output "web_cloudfront_domain" not found
```

**Root Cause**: CloudFront distribution creation depends on SSL certificate validation completion.

**Current Status**: SSL certificate is in `PENDING_VALIDATION` state, waiting for DNS propagation.

## 🔧 Troubleshooting Commands

### Check API Gateway Routes
```bash
aws apigatewayv2 get-routes --api-id 9qwxcajqf9 --region ap-northeast-1
```

### Check Lambda Function Status
```bash
aws lambda get-function --function-name chainy-dev-chainy-redirect --region ap-northeast-1
```

### Check DynamoDB Data
```bash
aws dynamodb get-item --table-name chainy-dev-chainy-links --key '{"code": {"S": "RfORZ0V"}}' --region ap-northeast-1
```

### Check CloudWatch Logs
```bash
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/chainy-dev" --region ap-northeast-1
aws logs get-log-events --log-group-name "/aws/lambda/chainy-dev-chainy-redirect" --log-stream-name "STREAM_NAME" --region ap-northeast-1
```

### Check SSL Certificate Status
```bash
aws acm describe-certificate --certificate-arn "CERTIFICATE_ARN" --region us-east-1
```

### Check Route 53 Records
```bash
aws route53 list-resource-record-sets --hosted-zone-id Z06876302P1V0WLWJPIUD
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Verify AWS CLI configuration
- [ ] Check Terraform state lock status
- [ ] Ensure all required environment variables are set
- [ ] Validate Terraform configuration

### Backend Deployment
- [ ] Set up SSM parameters
- [ ] Build Lambda functions
- [ ] Deploy infrastructure with Terraform
- [ ] Test API endpoints
- [ ] Verify DynamoDB table creation
- [ ] Check S3 bucket creation

### Frontend Deployment
- [ ] Build React application
- [ ] Upload files to S3
- [ ] Verify static file serving

### Domain Configuration
- [ ] Create Route 53 Hosted Zone
- [ ] Request SSL certificate
- [ ] Wait for DNS validation
- [ ] Create CloudFront distribution
- [ ] Configure custom domain

### Post-Deployment Testing
- [ ] Test API authentication
- [ ] Test short link creation
- [ ] Test short link redirection
- [ ] Test frontend functionality
- [ ] Verify SSL certificate
- [ ] Test custom domain

## 🎯 Best Practices Learned

### 1. Region Awareness
Always specify the correct AWS region when working with regional services. Different services may be in different regions.

### 2. API Field Validation
Always verify the exact field names expected by APIs by checking documentation or source code.

### 3. State Management
Monitor Terraform state locks and handle them appropriately to avoid deployment conflicts.

### 4. SSL Certificate Timing
SSL certificate validation can take 5-15 minutes. Plan deployment timing accordingly.

### 5. Logging and Monitoring
Use CloudWatch logs to debug Lambda function issues and API Gateway problems.

## 🔍 Next Steps

1. **Resolve Redirect Issue**: Debug why short link redirection returns 404
2. **Complete SSL Validation**: Wait for certificate validation to complete
3. **Test Custom Domain**: Verify `chainy.luichu.dev` works correctly
4. **Performance Testing**: Test API performance under load
5. **Monitoring Setup**: Implement comprehensive monitoring and alerting

## 📞 Support Resources

- **AWS Documentation**: [API Gateway](https://docs.aws.amazon.com/apigateway/), [Lambda](https://docs.aws.amazon.com/lambda/)
- **Terraform Documentation**: [AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- **CloudWatch Logs**: Monitor function execution and errors
- **AWS Support**: For production issues requiring AWS support
