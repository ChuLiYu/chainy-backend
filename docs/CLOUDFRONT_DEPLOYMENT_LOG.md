# CloudFront Deployment Log

## Deployment Date: 2025-10-05

### Issue Resolved: CloudFront Error 530

**Problem:** `chainy.luichu.dev` was returning Cloudflare Error 530 - Origin DNS Resolution Failed.

**Root Cause:** Cloudflare DNS was pointing to non-existent CloudFront distribution `d3hdtwr5zmjki6.cloudfront.net`.

### Deployment Steps

1. **Identified Missing CloudFront Distribution**
   ```bash
   aws cloudfront get-distribution --id d3hdtwr5zmjki6
   # Result: NoSuchDistribution error
   ```

2. **Deployed Web Module via Terraform**
   ```bash
   cd chainy
   terraform apply -target=module.web -auto-approve
   ```

3. **Resources Created:**
   - CloudFront Distribution: `E32Z667JCKF9BD`
   - CloudFront Domain: `d3eryivvnolnm9.cloudfront.net`
   - ACM Certificate: `arn:aws:acm:us-east-1:277375108569:certificate/9105158f-1726-46da-8ba5-e8b38881db24`
   - S3 Bucket: `chainy-prod-web`
   - Route53 Records: A and AAAA aliases

4. **DNS Configuration Update Required:**
   - **Old:** `chainy.luichu.dev` → `d3hdtwr5zmjki6.cloudfront.net` ❌
   - **New:** `chainy.luichu.dev` → `d3eryivvnolnm9.cloudfront.net` ✅

### CloudFront Configuration Details

**Distribution ID:** `E32Z667JCKF9BD`
**Domain Name:** `d3eryivvnolnm9.cloudfront.net`
**Status:** Deployed
**Aliases:** `chainy.luichu.dev`

**Origins:**
- API Gateway Origin: `9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com`
- S3 Web Origin: `chainy-prod-web.s3.ap-northeast-1.amazonaws.com`

**Cache Behaviors:**
- Default: API Gateway (all methods)
- `*.html`: S3 Web Origin (GET, HEAD, OPTIONS)
- `*.svg`: S3 Web Origin (GET, HEAD, OPTIONS)
- `/assets/*`: S3 Web Origin (GET, HEAD, OPTIONS)
- `/static/*`: S3 Web Origin (GET, HEAD, OPTIONS)

### SSL Certificate

**Certificate ARN:** `arn:aws:acm:us-east-1:277375108569:certificate/9105158f-1726-46da-8ba5-e8b38881db24`
**Domain:** `chainy.luichu.dev`
**Validation Method:** DNS
**Status:** Validated

### Next Steps

1. Update Cloudflare DNS to point to new CloudFront distribution
2. Wait for DNS propagation (1-5 minutes)
3. Test `https://chainy.luichu.dev` for proper functionality
4. Verify all API endpoints are working correctly

### Monitoring

- CloudFront distribution is configured with CloudWatch metrics
- SSL certificate is valid and properly configured
- All origins are properly configured with appropriate protocols

### Lessons Learned

1. Always verify CloudFront distribution exists before configuring DNS
2. Use Terraform to manage infrastructure consistently
3. Monitor CloudFront distribution status regularly
4. Document deployment steps for future reference
