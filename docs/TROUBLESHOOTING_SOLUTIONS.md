# Troubleshooting Solutions Documentation

## Overview
This document records the problems encountered during the chainy short URL service development and their solutions. All sensitive information has been removed or replaced with placeholders.

## 1. DNS and CloudFront Configuration Issues

### Problem: DNS Conflict Between Services
**Issue:** Both `chainy.luichu.dev` and `luichu.dev` were configured in the same CloudFront distribution, causing routing conflicts.

**Root Cause:** 
- `chainy.luichu.dev` was managed by Cloudflare
- `luichu.dev` was also configured in CloudFront
- DNS conflicts led to content display anomalies

**Solution:**
1. Separated the services by removing `luichu.dev` from CloudFront aliases
2. Configured `chainy.luichu.dev` to use its own S3 bucket origin
3. Updated CloudFront distribution to only handle chainy service

**Files Modified:**
- `current-cloudfront-config.json`: Removed `luichu.dev` from aliases, changed origin to `chainy-prod-web.s3-website.ap-northeast-1.amazonaws.com`

### Problem: S3 Bucket Region Mismatch
**Issue:** CloudFront origin pointed to wrong S3 region, causing `PermanentRedirect` errors.

**Root Cause:** S3 bucket `chainy-prod-web` was in `ap-northeast-1` but CloudFront was configured for `us-east-1`.

**Solution:**
- Updated CloudFront origin `DomainName` to `chainy-prod-web.s3-website.ap-northeast-1.amazonaws.com`
- Changed origin type from `S3OriginConfig` to `CustomOriginConfig` for S3 website endpoint

### Problem: CloudFront Origin Type Error
**Issue:** 403 Forbidden errors when accessing `chainy.luichu.dev`.

**Root Cause:** S3 bucket was configured for static website hosting, requiring `CustomOriginConfig` instead of `S3OriginConfig`.

**Solution:**
```json
"CustomOriginConfig": {
    "HTTPPort": 80,
    "HTTPSPort": 443,
    "OriginProtocolPolicy": "http-only",
    "OriginReadTimeout": 30,
    "OriginKeepaliveTimeout": 5,
    "OriginSslProtocols": {
        "Quantity": 1,
        "Items": ["TLSv1.2"]
    }
}
```

## 2. API Gateway and Lambda Issues

### Problem: "Failed to fetch" Errors
**Issue:** Short URL generation and Google login were failing with "failed to fetch" errors.

**Root Cause:** CloudFront was only allowing `HEAD` and `GET` methods, but API required `POST`, `PUT`, `DELETE`, and `OPTIONS`.

**Solution:**
- Updated CloudFront `DefaultCacheBehavior` to include all necessary HTTP methods
- Added API Gateway origin and specific cache behaviors for `/links` and `/links/*` paths

### Problem: CloudFront Routing Configuration
**Issue:** All requests were routed to S3 origin, causing 405 Method Not Allowed for API requests.

**Root Cause:** CloudFront lacked specific routing rules for API endpoints.

**Solution:**
- Added dedicated API Gateway origin
- Configured cache behaviors to route API paths to API Gateway origin
- Added static asset routing for `/assets/*`, `/*.html`, `/*.svg`

### Problem: Missing GET /links Route
**Issue:** 500 Internal Server Error when accessing "My Short URLs".

**Root Cause:** API Gateway was missing `GET /links` route to fetch user's short URL list.

**Solution:**
- Added `GET /links` route in API Gateway
- Modified `create.ts` Lambda handler to support both create and list operations
- Added `handleGetUserLinks` function with proper filtering

## 3. Authentication and Authorization Issues

### Problem: Google OAuth "Invalid OAuth code"
**Issue:** Google login was failing with "Invalid OAuth code" errors.

**Root Cause:** 
- OAuth codes are single-use and time-limited (~10 minutes)
- Google client secret was not properly configured in Lambda environment

**Solution:**
- Implemented SSM parameter retrieval for Google client secret
- Added proper error handling for expired OAuth codes
- Updated IAM permissions for Lambda to access SSM parameters

### Problem: DynamoDB Table Name Mismatch
**Issue:** `ResourceNotFoundException: Requested resource not found: Table: chainy-prod-users not found`

**Root Cause:** Incorrect table name in `terraform.tfvars` and IAM policies.

**Solution:**
- Updated `users_table_name` from `chainy-prod-users` to `chainy-prod-chainy-users`
- Updated `users_table_arn` accordingly
- Fixed IAM policies to reference correct table names

### Problem: DynamoDB Reserved Keyword Error
**Issue:** `ValidationException: Invalid FilterExpression: Attribute name is a reserved keyword; reserved keyword: owner`

**Root Cause:** `owner` is a reserved keyword in DynamoDB.

**Solution:**
- Used `ExpressionAttributeNames` to alias `#owner` to `owner`
- Updated FilterExpression to use `#owner = :owner`

### Problem: Missing DynamoDB Scan Permission
**Issue:** `AccessDeniedException: User is not authorized to perform: dynamodb:Scan`

**Root Cause:** Lambda IAM role lacked `dynamodb:Scan` permission.

**Solution:**
- Added `dynamodb:Scan` permission to Lambda execution role
- Updated IAM policy for `chainy-prod-chainy-create` function

## 4. User Authentication and Data Isolation

### Problem: Anonymous Short Links Appearing in User's List
**Issue:** Short links created without authentication were showing in authenticated user's personal list.

**Root Cause:** `handleGetUserLinks` was returning all links without filtering by owner.

**Solution:**
- Modified `handleCreate` to set `owner: "user-placeholder"` for authenticated users
- Updated `handleGetUserLinks` to filter by owner and exclude soft-deleted items
- Implemented proper user authentication logic

### Problem: Hard Delete vs Soft Delete
**Issue:** User requested soft delete functionality to preserve data.

**Root Cause:** Original implementation used hard delete (removing records from database).

**Solution:**
- Modified `handleDelete` to use `UpdateCommand` instead of `DeleteCommand`
- Added `deleted_at` timestamp field
- Updated list queries to exclude soft-deleted items using `attribute_not_exists(deleted_at)`

## 5. Infrastructure and Deployment Issues

### Problem: Terraform State Conflicts
**Issue:** `S3 bucket already exists` and `CNAME already exists` errors during Terraform apply.

**Root Cause:** Resources were created manually but not in Terraform state.

**Solution:**
- Imported existing S3 bucket: `terraform import 'module.web[0].aws_s3_bucket.web' chainy-prod-web`
- Imported existing CloudFront distribution: `terraform import 'module.web[0].aws_cloudfront_distribution.web' EOJPSKY8NNVO2`

### Problem: Missing Environment Variables
**Issue:** Short URLs were returning API Gateway endpoint instead of CloudFront domain.

**Root Cause:** Lambda function was missing `CHAINY_SHORT_BASE_URL` environment variable.

**Solution:**
- Updated `terraform.tfvars` to include `web_domain`, `web_subdomain`, and `web_hosted_zone_id`
- Ensured `CHAINY_SHORT_BASE_URL` is correctly set to `https://chainy.luichu.dev`

## 6. Security and Configuration Management

### Problem: Google Client Secret in Terraform
**Issue:** User asked about securely managing `google_client_secret` in `terraform.tfvars`.

**Root Cause:** Storing sensitive information in version control is a security risk.

**Solution:**
- Commented out `google_client_secret` in `terraform.tfvars`
- Implemented SSM parameter retrieval in Lambda code
- Provided guidance on using environment variables or SSM for local development

### Problem: Lambda Code Deployment Issues
**Issue:** Lambda function code updates were not being deployed correctly.

**Root Cause:** Build process and deployment steps were not properly synchronized.

**Solution:**
- Updated `build-lambdas.mjs` to include `googleAuth` handler
- Implemented proper build and deployment workflow
- Added verification steps to ensure code updates are deployed

## 7. Cloudflare and CloudFront Architecture

### Problem: SSL Handshake Failure
**Issue:** Cloudflare 525 SSL Handshake Failed when proxying to S3 Website Endpoint.

**Root Cause:** S3 Website Endpoints only support HTTP, while Cloudflare was attempting HTTPS.

**Solution:**
- Changed Cloudflare SSL/TLS encryption mode to "Flexible"
- Alternative: Use CloudFront for SSL termination

### Problem: DNS Configuration Confusion
**Issue:** User was confused about the roles of CNAME, CloudFront, and Cloudflare.

**Root Cause:** Complex architecture with multiple CDN layers.

**Solution:**
- Created comprehensive architecture documentation
- Explained request flow: User → Cloudflare → CloudFront → S3/API Gateway
- Documented functional division and cost-effectiveness

## Key Lessons Learned

1. **Infrastructure as Code**: Always manage resources through Terraform to avoid state conflicts
2. **Security**: Never store sensitive information in version control; use SSM or environment variables
3. **Testing**: Test OAuth flows with fresh codes as they are single-use and time-limited
4. **Documentation**: Maintain comprehensive documentation for complex architectures
5. **Error Handling**: Implement proper error handling and logging for debugging
6. **User Experience**: Consider user authentication and data isolation requirements
7. **Soft Delete**: Implement soft delete for data preservation and audit trails

## Files Modified During Troubleshooting

### Core Application Files
- `handlers/create.ts`: User authentication, soft delete, list functionality
- `handlers/googleAuth.ts`: SSM parameter retrieval, OAuth handling
- `main.tf`: Google Auth module integration
- `modules/api/main.tf`: API Gateway routes and integrations
- `modules/api/variables.tf`: Variable definitions
- `scripts/build-lambdas.mjs`: Build process updates

### Configuration Files
- `terraform.tfvars`: Environment variables and table names
- `current-cloudfront-config.json`: CloudFront distribution configuration

### Documentation Files
- `docs/CHAINY_API_TROUBLESHOOTING.md`: API troubleshooting guide
- `docs/CLOUDFLARE_CLOUDFRONT_ARCHITECTURE.md`: Architecture documentation
- `docs/DNS_CLOUDFRONT_MIGRATION.md`: Migration documentation

## Conclusion

The troubleshooting process involved multiple layers of the application stack, from DNS configuration to Lambda function deployment. Key success factors included:

1. Systematic debugging approach
2. Proper error logging and monitoring
3. Comprehensive testing at each step
4. Documentation of solutions for future reference
5. Security best practices implementation

All issues were resolved through careful analysis, proper configuration, and systematic testing. The application now provides a robust short URL service with proper user authentication, data isolation, and soft delete functionality.
