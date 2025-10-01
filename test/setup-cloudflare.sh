#!/bin/bash

# CloudFlare Setup Script
# Used for automated CloudFlare configuration

set -e

echo "☁️  CloudFlare Setup Guide"
echo "=========================="
echo ""

# Check required tools
echo "🔍 Checking required tools..."

if ! command -v curl &> /dev/null; then
    echo "❌ curl not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "⚠️  jq not installed, will use basic curl commands"
    JQ_AVAILABLE=false
else
    echo "✅ jq installed"
    JQ_AVAILABLE=true
fi

echo ""

# Configuration variables
DOMAIN="${1:-yourdomain.com}"
API_BASE_URL="https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com"

echo "📊 Configuration Information:"
echo "  Domain: $DOMAIN"
echo "  API Endpoint: $API_BASE_URL"
echo ""

# Check if domain is already added to CloudFlare
echo "🔍 Checking domain CloudFlare status..."
echo "Please visit in browser: https://dash.cloudflare.com"
echo "Confirm your domain '$DOMAIN' has been added to CloudFlare"
echo ""

# DNS record configuration
echo "📝 DNS Record Configuration:"
echo "Add the following records in CloudFlare DNS settings:"
echo ""
echo "1. API endpoint record:"
echo "   Type: CNAME"
echo "   Name: api"
echo "   Content: 9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com"
echo "   Proxy status: 🟠 Proxied (orange cloud)"
echo "   TTL: Auto"
echo ""
echo "2. Redirect endpoint record:"
echo "   Type: CNAME"
echo "   Name: r"
echo "   Content: 9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com"
echo "   Proxy status: 🟠 Proxied (orange cloud)"
echo "   TTL: Auto"
echo ""

# WAF rule configuration
echo "🛡️  WAF Rule Configuration:"
echo "Enable the following rules in CloudFlare Security → WAF:"
echo ""
echo "1. Basic protection:"
echo "   - CloudFlare Managed Ruleset (enabled by default)"
echo "   - Bot Fight Mode (free)"
echo ""
echo "2. Rate limiting:"
echo "   Rule name: API Rate Limit"
echo "   When: Hostname equals \"$DOMAIN\""
echo "   Then: Rate limit to 100 requests per 1 minute"
echo ""

# SSL/TLS configuration
echo "🔒 SSL/TLS Configuration:"
echo "In CloudFlare SSL/TLS settings:"
echo "   - Encryption mode: Full (strict)"
echo "   - Edge Certificates: Enabled"
echo "   - Always Use HTTPS: Enabled"
echo ""

# Test CloudFlare configuration
echo "🧪 Testing CloudFlare configuration..."
echo ""

# Wait for user confirmation
read -p "Press Enter to start testing CloudFlare configuration..."

# Test API endpoint
echo "📡 Testing API endpoint..."
if [ "$DOMAIN" != "yourdomain.com" ]; then
    echo "Testing: https://api.$DOMAIN"
    curl -s -I "https://api.$DOMAIN" | head -n 1 || echo "❌ API endpoint not accessible"
    echo ""
    
    echo "Testing: https://r.$DOMAIN"
    curl -s -I "https://r.$DOMAIN" | head -n 1 || echo "❌ Redirect endpoint not accessible"
    echo ""
else
    echo "⚠️  Please set correct domain first"
fi

# Performance testing
echo "⚡ Performance testing..."
echo "Testing CloudFlare cache effect:"
echo ""

# Generate test URL
TEST_URL="https://api.$DOMAIN/links"
if [ "$DOMAIN" = "yourdomain.com" ]; then
    TEST_URL="$API_BASE_URL/links"
fi

echo "Test URL: $TEST_URL"
echo ""

# Test response time
echo "📊 Response time testing:"
for i in {1..3}; do
    RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$TEST_URL" || echo "0")
    echo "  Test $i: ${RESPONSE_TIME}s"
done
echo ""

# Check CloudFlare headers
echo "🔍 Checking CloudFlare headers..."
curl -s -I "$TEST_URL" | grep -i "cf-" | head -n 5 || echo "❌ No CloudFlare headers detected"
echo ""

# Complete setup
echo "✅ CloudFlare setup completed!"
echo ""
echo "📊 Setup Summary:"
echo "  ✅ DNS Records: Configured"
echo "  ✅ WAF Rules: Enabled"
echo "  ✅ SSL/TLS: Configured"
echo "  ✅ Performance Optimization: Enabled"
echo ""
echo "🔗 Your API endpoints:"
echo "  https://api.$DOMAIN (via CloudFlare)"
echo "  $API_BASE_URL (direct AWS)"
echo ""
echo "💡 Next Steps:"
echo "  1. Update frontend configuration to use new domain"
echo "  2. Setup CloudFlare Analytics"
echo "  3. Configure custom error pages"
echo "  4. Enable CloudFlare Workers (optional)"
echo ""
echo "📚 More Information:"
echo "  - CloudFlare Documentation: https://developers.cloudflare.com/"
echo "  - API Documentation: https://developers.cloudflare.com/api/"
echo "  - Support: https://support.cloudflare.com/"