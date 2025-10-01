# Chainy Troubleshooting Log

## Date: October 1, 2025

This document records issues encountered during Chainy deployment and their solutions.

---

## Issue #1: Frontend Not Accessible - JSON Error Instead of HTML

### Problem Description

When accessing `https://chainy.luichu.dev/` or any short link like `https://chainy.luichu.dev/RMKe0Vd`, users received JSON error messages instead of the frontend web interface:

```json
{ "message": "Short link not found" }
```

### Root Cause

CloudFront's default cache behavior was configured to route ALL requests (including root path `/`) to API Gateway origin. The frontend files existed in S3 bucket but were unreachable because:

1. All paths were sent to API Gateway Lambda
2. Lambda returned JSON errors for non-existent short codes
3. No routing rules existed to serve HTML files from S3

### Solution

#### 1. Updated CloudFront Routing Configuration

File: `chainy/modules/web/main.tf`

Added ordered cache behaviors to route static files to S3:

```hcl
# Route HTML files to S3
ordered_cache_behavior {
  path_pattern     = "*.html"
  target_origin_id = "s3-web-origin"
  # ... (cache settings)
}

# Route SVG files to S3
ordered_cache_behavior {
  path_pattern     = "*.svg"
  target_origin_id = "s3-web-origin"
  # ... (cache settings)
}
```

#### 2. Enhanced Redirect Lambda for Browser-Friendly Responses

File: `chainy/handlers/redirect.ts`

**Root Path Handling:**

```typescript
// Handle root path - redirect to frontend
if (!code || code === "" || code === "/") {
  const webDomain = process.env.WEB_DOMAIN;
  const webSubdomain = process.env.WEB_SUBDOMAIN || "chainy";
  const fullDomain = webDomain ? `https://${webSubdomain}.${webDomain}` : "";

  if (fullDomain) {
    return {
      statusCode: 302,
      headers: {
        Location: `${fullDomain}/index.html`,
        "Cache-Control": "no-store",
      },
      body: "",
    };
  }
}
```

**Browser-Friendly 404 Page:**

```typescript
if (!Item) {
  const acceptHeader = event.headers?.accept || event.headers?.Accept || "";
  const isFromBrowser = acceptHeader.includes("text/html");

  if (isFromBrowser) {
    // Return styled HTML 404 page
    return {
      statusCode: 404,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-store",
      },
      body: `<!DOCTYPE html>...`, // Beautiful 404 page
    };
  }

  // Return JSON for API requests
  return jsonResponse(404, { message: "Short link not found" });
}
```

#### 3. Deployment Steps

```bash
# Rebuild Lambda functions
cd chainy
npm run package

# Apply Terraform changes
terraform apply -auto-approve

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E3NPZS3FX3FUIT --paths "/*"
```

### Result

✅ Root path now serves frontend interface from S3
✅ Short links redirect correctly
✅ Non-existent links show beautiful 404 page for browsers
✅ API requests still receive JSON responses

---

## Issue #2: HTTP API Does Not Support API Key Authentication

### Problem Description

Terraform deployment failed with error:

```
Error: ApiKeyRequired is not currently supported for HTTP APIs
Error: Usage plans are not allowed for HTTP Apis
```

### Root Cause

AWS API Gateway v2 (HTTP API) does not support API Key authentication, only REST APIs do. The configuration attempted to add:

- `api_key_required = true` on routes
- API Gateway Usage Plans
- API Keys

### Solution

#### 1. Removed Unsupported Resources

File: `chainy/modules/api/main.tf`

Removed:

```hcl
# Removed: api_key_required from routes
# Removed: aws_api_gateway_api_key resource
# Removed: aws_api_gateway_usage_plan resource
# Removed: aws_api_gateway_usage_plan_key resource
```

#### 2. Updated Outputs

File: `chainy/modules/api/outputs.tf`

Removed API key outputs:

```hcl
# Removed: api_key_id output
# Removed: api_key_value output
```

File: `chainy/outputs.tf`

```hcl
# Removed: api_key_id output
```

### Alternative Solutions for Future

For production authentication, consider:

- AWS Lambda Authorizer (custom authorization logic)
- Amazon Cognito User Pools
- JWT validation in Lambda
- AWS IAM authentication
- Migrate to REST API if API Keys are essential

### Result

✅ Terraform deployment successful
✅ API Gateway configured correctly without unsupported features

---

## Issue #3: ESLint Error - Unused Function

### Problem Description

CI/CD pipeline failed with ESLint error:

```
/home/runner/work/chainy-web/chainy-web/src/App.jsx
Error: 100:9 error 'toggleLanguage' is assigned a value but never used
```

### Root Cause

Function `toggleLanguage` was defined but never called. Language switching buttons directly used `setLanguage('zh')` and `setLanguage('en')` instead.

### Solution

File: `chainy-web/src/App.jsx`

Removed unused function:

```javascript
// REMOVED:
const toggleLanguage = () => {
  setLanguage((prev) => (prev === "zh" ? "en" : "zh"));
};
```

Language buttons already use direct state updates:

```javascript
<button onClick={() => setLanguage('zh')}>中文</button>
<button onClick={() => setLanguage('en')}>EN</button>
```

### Result

✅ ESLint checks pass
✅ CI/CD pipeline successful

---

## Issue #4: Branding Update for Crypto Community

### Enhancement Description

Updated slogan to better resonate with cryptocurrency enthusiasts.

### Changes

File: `chainy-web/src/App.jsx`

**Before:**

```javascript
zh: {
  slogan: '極速生成，即刻分享',
},
en: {
  slogan: 'Generate Fast, Share Instantly',
}
```

**After:**

```javascript
zh: {
  slogan: '秒縮網址，WAGMI 🚀',
},
en: {
  slogan: 'Instant Links, WAGMI 🚀',
}
```

### Rationale

- "WAGMI" (We're All Gonna Make It) - Popular crypto community meme
- 🚀 Rocket emoji - "To the Moon" reference
- Emphasizes speed - Important for crypto traders
- Creates community connection

### Deployment

```bash
cd chainy-web
npm run build
aws s3 sync dist/ s3://chainy-dev-web/ --delete
aws cloudfront create-invalidation --distribution-id E3NPZS3FX3FUIT --paths "/*"
```

### Result

✅ Branding updated for target audience
✅ Maintained bilingual support

---

## Architecture Overview

### Current Setup

```
User Request
    ↓
CloudFront (CDN)
    ├─→ S3 Origin (for *.html, *.svg, /assets/*, /static/*)
    │   └─→ Frontend React App
    └─→ API Gateway Origin (default - for short codes)
        └─→ Lambda Functions
            ├─→ redirect.ts (GET /{code})
            └─→ create.ts (POST/PUT/DELETE /links)
```

### Key Files Modified

1. `chainy/modules/web/main.tf` - CloudFront routing configuration
2. `chainy/handlers/redirect.ts` - Lambda redirect logic with HTML fallback
3. `chainy/modules/api/main.tf` - API Gateway configuration (removed API Key)
4. `chainy-web/src/App.jsx` - Frontend UI and branding

---

## Best Practices Learned

### 1. CloudFront Origin Routing

- Use `ordered_cache_behavior` with specific path patterns for static content
- Default behavior should handle dynamic content (short codes)
- Use wildcard patterns (`*.html`, `*.svg`) for file types
- Use path patterns (`/assets/*`, `/static/*`) for directories

### 2. Lambda Response Types

- Check `Accept` header to determine response format
- Return HTML for browser requests
- Return JSON for API clients
- Improves user experience significantly

### 3. HTTP API vs REST API

- HTTP APIs are cheaper and faster
- HTTP APIs don't support API Keys or Usage Plans
- Use Lambda Authorizers for HTTP API authentication
- Consider REST API if API Keys are required

### 4. CloudFront Cache Invalidation

- Always invalidate cache after infrastructure changes
- Use `/*` for comprehensive invalidation
- Expect 2-3 minutes for changes to propagate

### 5. Static Site Deployment

- Sync to S3: `aws s3 sync dist/ s3://bucket/ --delete`
- Invalidate CloudFront: `aws cloudfront create-invalidation --distribution-id X --paths "/*"`
- Verify S3 contents: `aws s3 ls s3://bucket/ --recursive`

---

## Commands Reference

### Lambda Build

```bash
cd chainy
npm run package
```

### Infrastructure Deployment

```bash
cd chainy
terraform apply -auto-approve
```

### Frontend Deployment

```bash
cd chainy-web
npm run build
aws s3 sync dist/ s3://chainy-dev-web/ --delete
aws cloudfront create-invalidation --distribution-id E3NPZS3FX3FUIT --paths "/*"
```

### Verification

```bash
# Check S3 contents
aws s3 ls s3://chainy-dev-web/ --recursive

# Check CloudFront invalidation status
aws cloudfront get-invalidation --distribution-id E3NPZS3FX3FUIT --id INVALIDATION_ID

# Test endpoint
curl -I https://chainy.luichu.dev/
```

---

## Environment Information

- **AWS Region**: ap-northeast-1
- **Domain**: chainy.luichu.dev
- **CloudFront Distribution ID**: E3NPZS3FX3FUIT
- **S3 Web Bucket**: chainy-dev-web
- **API Gateway Endpoint**: https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com
- **DynamoDB Table**: chainy-dev-chainy-links
- **Events Bucket**: chainy-dev-chainy-events

---

## Future Improvements

### Security

- [ ] Implement Lambda Authorizer for API authentication
- [ ] Add rate limiting at Lambda level
- [ ] Implement CAPTCHA for link creation
- [ ] Add bot protection

### Performance

- [ ] Optimize Lambda cold start time
- [ ] Implement connection pooling for DynamoDB
- [ ] Add caching layer for frequently accessed links

### Features

- [ ] Custom short code generation
- [ ] Link expiration settings
- [ ] Click analytics dashboard
- [ ] QR code generation
- [ ] Link preview before redirect

### Monitoring

- [ ] Set up CloudWatch alarms
- [ ] Add X-Ray tracing
- [ ] Implement detailed logging
- [ ] Create operational dashboard

---

**Document Version**: 1.0  
**Last Updated**: October 1, 2025  
**Maintained By**: Development Team
