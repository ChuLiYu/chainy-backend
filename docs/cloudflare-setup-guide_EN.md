# ☁️ CloudFlare Setup Guide for Chainy

## 📋 Overview

This guide provides step-by-step instructions for setting up CloudFlare as a cost-effective alternative to AWS WAF for your Chainy short link service.

## 🎯 Why CloudFlare?

### Cost Comparison

| Feature          | AWS WAF           | CloudFlare Free |
| ---------------- | ----------------- | --------------- |
| DDoS Protection  | $1/GB             | Unlimited       |
| WAF Rules        | $1/rule/month     | 5 free rules    |
| Rate Limiting    | $0.60/1M requests | 1000/min free   |
| SSL/TLS          | $0.10/certificate | Unlimited       |
| CDN              | $0.085/GB         | Unlimited       |
| **Monthly Cost** | **$5-10**         | **$0**          |

### Benefits

- ✅ **Free DDoS Protection**: Unlimited traffic
- ✅ **Global CDN**: Faster content delivery
- ✅ **Free SSL/TLS**: Automatic certificates
- ✅ **Basic WAF**: Core security rules
- ✅ **Rate Limiting**: Configurable limits
- ✅ **Analytics**: Traffic insights

## 🚀 Step-by-Step Setup

### Step 1: Register CloudFlare Account

1. **Visit CloudFlare Website**

   ```
   https://www.cloudflare.com/
   ```

2. **Sign Up**

   - Click "Sign Up"
   - Enter your email
   - Create password
   - Verify email address

3. **Choose Plan**
   - Select **Free** plan
   - No credit card required

### Step 2: Add Your Domain

1. **Add Site**

   - Click "Add a Site"
   - Enter your domain (e.g., `yourdomain.com`)
   - Click "Add Site"

2. **Select Plan**

   - Choose **Free** plan
   - Click "Continue"

3. **DNS Scan**
   - CloudFlare will scan existing DNS records
   - Review detected records
   - Click "Continue"

### Step 3: Update Nameservers

1. **Get CloudFlare Nameservers**

   ```
   Example nameservers:
   - alice.ns.cloudflare.com
   - bob.ns.cloudflare.com
   ```

2. **Update at Domain Registrar**

   - Log in to your domain registrar
   - Go to DNS settings
   - Replace nameservers with CloudFlare ones
   - Save changes

3. **Wait for Propagation**
   - DNS changes take 24-48 hours
   - Check status in CloudFlare dashboard

### Step 4: Configure DNS Records

1. **Go to DNS Settings**

   - In CloudFlare dashboard
   - Click "DNS" → "Records"

2. **Add API Endpoint Record**

   ```
   Type: CNAME
   Name: api
   Content: 9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com
   Proxy status: 🟠 Proxied (orange cloud)
   TTL: Auto
   ```

3. **Add Redirect Endpoint Record**

   ```
   Type: CNAME
   Name: r
   Content: 9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com
   Proxy status: 🟠 Proxied (orange cloud)
   TTL: Auto
   ```

4. **Add Root Domain Record (Optional)**
   ```
   Type: CNAME
   Name: @
   Content: 9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com
   Proxy status: 🟠 Proxied (orange cloud)
   TTL: Auto
   ```

### Step 5: Enable Security Features

1. **Go to Security Settings**

   - Click "Security" → "WAF"

2. **Enable Managed Rules**

   - CloudFlare Managed Ruleset: **On**
   - Bot Fight Mode: **On**

3. **Create Rate Limiting Rule**

   - Click "Rate Limiting Rules"
   - Click "Create rule"
   - Configure:
     ```
     Rule name: API Rate Limit
     When: Hostname equals "yourdomain.com"
     Then: Rate limit to 100 requests per 1 minute
     ```

4. **Enable Additional Security**
   - Security Level: **Medium**
   - Challenge Passage: **30 minutes**
   - Browser Integrity Check: **On**

### Step 6: Configure SSL/TLS

1. **Go to SSL/TLS Settings**

   - Click "SSL/TLS" → "Overview"

2. **Set Encryption Mode**

   - Encryption mode: **Full (strict)**
   - Edge Certificates: **On**
   - Always Use HTTPS: **On**

3. **Enable Additional Features**
   - HTTP Strict Transport Security (HSTS): **On**
   - Minimum TLS Version: **TLS 1.2**

### Step 7: Configure Caching

1. **Go to Caching Settings**

   - Click "Caching" → "Configuration"

2. **Set Caching Level**

   - Caching Level: **Standard**
   - Browser Cache TTL: **4 hours**

3. **Configure Page Rules (Optional)**
   - Click "Page Rules"
   - Create rule for API endpoints:
     ```
     URL: api.yourdomain.com/*
     Settings:
     - Cache Level: Bypass
     - Security Level: High
     ```

## 🧪 Testing Configuration

### 1. Test DNS Resolution

```bash
# Test API endpoint
nslookup api.yourdomain.com

# Test redirect endpoint
nslookup r.yourdomain.com
```

### 2. Test SSL/TLS

```bash
# Test SSL certificate
openssl s_client -connect api.yourdomain.com:443 -servername api.yourdomain.com

# Test HTTPS redirect
curl -I http://api.yourdomain.com/links
```

### 3. Test Rate Limiting

```bash
# Test rate limit
for i in {1..10}; do
  curl -X GET https://api.yourdomain.com/links/test123
  sleep 1
done
```

### 4. Test WAF Protection

```bash
# Test SQL injection protection
curl -X POST https://api.yourdomain.com/links \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "code": "test\"; DROP TABLE links; --"}'

# Test XSS protection
curl -X POST https://api.yourdomain.com/links \
  -H "Content-Type: application/json" \
  -d '{"url": "<script>alert(\"xss\")</script>", "code": "test"}'
```

## 📊 Monitoring and Analytics

### 1. CloudFlare Analytics

- **Traffic**: Request volume and patterns
- **Security**: Blocked threats and attacks
- **Performance**: Response times and cache hit rates
- **Reliability**: Uptime and error rates

### 2. Custom Monitoring

```bash
# Monitor CloudFlare status
curl -s "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/analytics/dashboard" \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Check security events
curl -s "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/security/events" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

## 🔧 Advanced Configuration

### 1. CloudFlare Workers (Optional)

```javascript
// Custom rate limiting with Workers
addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const ip = request.headers.get("CF-Connecting-IP");
  const rateLimitKey = `rate_limit:${ip}`;

  // Check rate limit
  const count = await RATE_LIMIT_KV.get(rateLimitKey);
  if (count && parseInt(count) > 100) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  // Increment counter
  await RATE_LIMIT_KV.put(rateLimitKey, (parseInt(count) || 0) + 1, {
    expirationTtl: 60,
  });

  // Forward request
  return fetch(request);
}
```

### 2. Custom Error Pages

```html
<!-- Custom 404 page -->
<!DOCTYPE html>
<html>
  <head>
    <title>Page Not Found - Chainy</title>
  </head>
  <body>
    <h1>404 - Page Not Found</h1>
    <p>The requested page could not be found.</p>
    <a href="/">Go Home</a>
  </body>
</html>
```

### 3. API Gateway Integration

```bash
# Update API Gateway custom domain
aws apigateway create-domain-name \
  --domain-name api.yourdomain.com \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
```

## 🚨 Troubleshooting

### Common Issues

1. **DNS Not Propagating**

   ```bash
   # Check DNS propagation
   dig @8.8.8.8 api.yourdomain.com

   # Check CloudFlare status
   https://www.cloudflarestatus.com/
   ```

2. **SSL Certificate Issues**

   ```bash
   # Check certificate
   openssl s_client -connect api.yourdomain.com:443

   # Verify CloudFlare certificate
   curl -I https://api.yourdomain.com
   ```

3. **Rate Limiting Too Strict**

   ```bash
   # Adjust rate limiting rules
   # Go to Security → WAF → Rate Limiting Rules
   # Modify threshold or time window
   ```

4. **WAF Blocking Legitimate Requests**
   ```bash
   # Check security events
   # Go to Security → Events
   # Review blocked requests
   # Add IP to whitelist if needed
   ```

### Performance Optimization

1. **Enable Argo Smart Routing**

   - Go to Network → Argo
   - Enable Argo Smart Routing
   - Reduces latency by 30%

2. **Configure Caching**

   - Set appropriate cache headers
   - Use Page Rules for fine-grained control
   - Monitor cache hit rates

3. **Enable HTTP/2**
   - Automatically enabled
   - Improves performance for multiple requests

## 📚 Additional Resources

### CloudFlare Documentation

- **Getting Started**: https://developers.cloudflare.com/fundamentals/get-started/
- **DNS Management**: https://developers.cloudflare.com/dns/
- **Security Features**: https://developers.cloudflare.com/security/
- **Analytics**: https://developers.cloudflare.com/analytics/

### API References

- **CloudFlare API**: https://developers.cloudflare.com/api/
- **Workers API**: https://developers.cloudflare.com/workers/
- **Page Rules API**: https://developers.cloudflare.com/page-rules/

### Support

- **Community Forum**: https://community.cloudflare.com/
- **Support Center**: https://support.cloudflare.com/
- **Status Page**: https://www.cloudflarestatus.com/

## 🎉 Conclusion

With CloudFlare setup complete, your Chainy service now has:

- ✅ **Free DDoS Protection**: Unlimited traffic
- ✅ **Global CDN**: Faster content delivery
- ✅ **Free SSL/TLS**: Automatic certificates
- ✅ **Basic WAF**: Core security rules
- ✅ **Rate Limiting**: Configurable limits
- ✅ **Analytics**: Traffic insights
- ✅ **Cost Savings**: $5-10/month saved

Your Chainy project is now protected by CloudFlare and ready for production! 🚀
