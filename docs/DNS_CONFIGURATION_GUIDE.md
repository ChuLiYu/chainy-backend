# DNS Configuration Guide for CloudFront Error 530 Resolution

## Overview

This guide provides step-by-step instructions for resolving CloudFront Error 530 by updating DNS configuration in Cloudflare.

## Problem Description

**Error:** Cloudflare Error 530 - Origin DNS Resolution Failed
**Domain:** `chainy.luichu.dev`
**Root Cause:** DNS pointing to non-existent CloudFront distribution

## Current Status

### Before Fix

- **CNAME Target:** `d3hdtwr5zmjki6.cloudfront.net` ❌ (Does not exist)
- **Error:** Cloudflare Error 530
- **Status:** Service unavailable

### After Fix

- **CNAME Target:** `d3eryivvnolnm9.cloudfront.net` ✅ (Active distribution)
- **CloudFront Distribution ID:** `E32Z667JCKF9BD`
- **Status:** Service should be available after DNS update

## Step-by-Step DNS Update Instructions

### 1. Access Cloudflare Dashboard

1. Navigate to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Log in with your credentials
3. Select the `luichu.dev` domain

### 2. Locate DNS Records

1. Click on **DNS** in the left sidebar
2. Find the `chainy` record in the DNS records list
3. The record should currently show:
   - **Type:** CNAME
   - **Name:** chainy
   - **Target:** `d3hdtwr5zmjki6.cloudfront.net` (old, non-existent)
   - **Proxy Status:** 🟠 Proxied (Orange Cloud)

### 3. Update DNS Record

1. Click the **Edit** button (pencil icon) next to the `chainy` record
2. Update the **Target** field:
   - **Old:** `d3hdtwr5zmjki6.cloudfront.net`
   - **New:** `d3eryivvnolnm9.cloudfront.net`
3. Ensure **Proxy Status** remains **Proxied** (Orange Cloud) ✅
4. Click **Save** to apply changes

### 4. Verify Configuration

The updated record should show:

- **Type:** CNAME
- **Name:** chainy
- **Target:** `d3eryivvnolnm9.cloudfront.net`
- **Proxy Status:** 🟠 Proxied (Orange Cloud)

## Verification Steps

### 1. DNS Propagation Check

```bash
# Check DNS resolution
nslookup chainy.luichu.dev

# Expected result: Cloudflare IPs
# 172.67.146.31, 104.21.10.168
```

### 2. Service Availability Test

```bash
# Test HTTPS connectivity
curl -I https://chainy.luichu.dev

# Expected result: HTTP 200 OK (instead of 530)
```

### 3. CloudFront Distribution Verification

```bash
# Verify CloudFront distribution exists
aws cloudfront get-distribution --id E32Z667JCKF9BD

# Expected result: Distribution details with status "Deployed"
```

## Timeline Expectations

- **DNS Propagation:** 1-5 minutes
- **CloudFront Cache Update:** 5-15 minutes
- **Full Service Availability:** 5-20 minutes

## Troubleshooting

### If Error 530 Persists

1. **Check DNS Propagation:**

   ```bash
   dig chainy.luichu.dev
   # Should show Cloudflare IPs
   ```

2. **Verify CloudFront Status:**

   ```bash
   aws cloudfront get-distribution --id E32Z667JCKF9BD
   # Should show status "Deployed"
   ```

3. **Clear Browser Cache:**

   - Hard refresh (Ctrl+F5 or Cmd+Shift+R)
   - Or use incognito/private browsing mode

4. **Check Cloudflare Cache:**
   - In Cloudflare dashboard, go to **Caching** → **Purge Cache**
   - Select "Purge Everything"

### If Service Still Unavailable

1. **Verify SSL Certificate:**

   ```bash
   openssl s_client -connect chainy.luichu.dev:443 -servername chainy.luichu.dev
   ```

2. **Check CloudFront Origin Configuration:**

   - Ensure origins are properly configured
   - Verify SSL/TLS settings

3. **Monitor CloudWatch Logs:**
   - Check CloudFront access logs
   - Review Lambda function logs if applicable

## Prevention Measures

### 1. Infrastructure as Code

- Always manage CloudFront distributions through Terraform
- Include DNS records in Terraform configuration when possible

### 2. Monitoring

- Set up CloudWatch alarms for CloudFront distribution status
- Monitor DNS resolution health

### 3. Documentation

- Keep DNS configuration documentation up to date
- Document all CloudFront distribution IDs and domains

### 4. Testing

- Test DNS changes in staging environment first
- Verify service availability after any DNS changes

## Related Documentation

- [CloudFront Deployment Log](../docs/CLOUDFRONT_DEPLOYMENT_LOG.md)
- [Troubleshooting Solutions](../docs/TROUBLESHOOTING_SOLUTIONS.md)
- [Cloudflare CloudFront Architecture](../docs/CLOUDFLARE_CLOUDFRONT_ARCHITECTURE.md)

## Contact Information

For additional support or questions regarding this DNS configuration:

- Check AWS CloudFront documentation
- Review Cloudflare DNS documentation
- Consult Terraform CloudFront module documentation
