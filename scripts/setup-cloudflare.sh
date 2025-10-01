#!/bin/bash

# Chainy CloudFlare Setup Script
# This script helps you set up CloudFlare for Chainy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}☁️ Chainy CloudFlare Setup${NC}"
echo "=============================="

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Please provide a domain name${NC}"
    echo -e "${BLUE}Usage: $0 <domain>${NC}"
    echo -e "${BLUE}Example: $0 example.com${NC}"
    exit 1
fi

DOMAIN="$1"
SUBDOMAIN="api"
FULL_DOMAIN="${SUBDOMAIN}.${DOMAIN}"

echo -e "${BLUE}📋 Domain: ${FULL_DOMAIN}${NC}"

# Get API Gateway endpoint
echo -e "${BLUE}🔍 Getting API Gateway endpoint...${NC}"
API_ENDPOINT=$(cd /Users/liyu/Programing/aws/chainy && terraform output -raw api_endpoint 2>/dev/null || echo "https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com")

if [ -z "$API_ENDPOINT" ]; then
    echo -e "${RED}❌ Could not get API Gateway endpoint${NC}"
    echo -e "${YELLOW}⚠️  Please make sure Terraform is deployed and API endpoint is available${NC}"
    exit 1
fi

echo -e "${GREEN}✅ API Gateway endpoint: ${API_ENDPOINT}${NC}"

echo ""
echo -e "${BLUE}📋 CloudFlare Setup Instructions:${NC}"
echo "=================================="
echo ""
echo -e "${YELLOW}1. Register CloudFlare Account:${NC}"
echo "   - Go to https://cloudflare.com"
echo "   - Sign up for a free account"
echo "   - Verify your email"
echo ""
echo -e "${YELLOW}2. Add Your Domain:${NC}"
echo "   - Click 'Add a Site'"
echo "   - Enter: ${DOMAIN}"
echo "   - Select 'Free' plan"
echo "   - Click 'Continue'"
echo ""
echo -e "${YELLOW}3. Update Name Servers:${NC}"
echo "   - CloudFlare will show you 2 Name Servers"
echo "   - Go to your domain registrar (GoDaddy, Namecheap, etc.)"
echo "   - Update Name Servers to CloudFlare's servers"
echo "   - Wait 5-15 minutes for propagation"
echo ""
echo -e "${YELLOW}4. Configure DNS Records:${NC}"
echo "   - In CloudFlare Dashboard, go to 'DNS' tab"
echo "   - Add a CNAME record:"
echo "     Type: CNAME"
echo "     Name: ${SUBDOMAIN}"
echo "     Target: ${API_ENDPOINT#https://}"
echo "     Proxy status: ✅ Proxied (orange cloud)"
echo "   - Click 'Save'"
echo ""
echo -e "${YELLOW}5. Enable Security Features:${NC}"
echo "   - Go to 'Security' tab"
echo "   - Enable 'WAF' (Web Application Firewall)"
echo "   - Enable 'Bot Fight Mode'"
echo "   - Enable 'Rate Limiting' (if available)"
echo ""
echo -e "${YELLOW}6. SSL/TLS Settings:${NC}"
echo "   - Go to 'SSL/TLS' tab"
echo "   - Set encryption mode to 'Full (strict)'"
echo "   - Enable 'Always Use HTTPS'"
echo ""

echo -e "${BLUE}🧪 Testing Commands:${NC}"
echo "====================="
echo ""
echo -e "${BLUE}Test DNS resolution:${NC}"
echo "nslookup ${FULL_DOMAIN}"
echo ""
echo -e "${BLUE}Test HTTPS access:${NC}"
echo "curl -I https://${FULL_DOMAIN}/"
echo ""
echo -e "${BLUE}Test API endpoint:${NC}"
echo "curl -I https://${FULL_DOMAIN}/links"
echo ""

echo -e "${BLUE}📋 Expected Results:${NC}"
echo "======================"
echo ""
echo -e "${GREEN}✅ DNS should resolve to CloudFlare IPs (104.x.x.x)${NC}"
echo -e "${GREEN}✅ HTTPS should work with CloudFlare SSL certificate${NC}"
echo -e "${GREEN}✅ API should return 403 (authentication required)${NC}"
echo ""

echo -e "${BLUE}🔧 Troubleshooting:${NC}"
echo "====================="
echo ""
echo -e "${YELLOW}If DNS doesn't resolve:${NC}"
echo "  - Check Name Servers are updated at domain registrar"
echo "  - Wait 15-30 minutes for propagation"
echo "  - Use 'dig ${FULL_DOMAIN}' to check"
echo ""
echo -e "${YELLOW}If HTTPS doesn't work:${NC}"
echo "  - Check SSL/TLS mode is 'Full (strict)'"
echo "  - Ensure CNAME record is proxied (orange cloud)"
echo "  - Wait 5-10 minutes for SSL certificate"
echo ""
echo -e "${YELLOW}If API returns errors:${NC}"
echo "  - Check CNAME target is correct"
echo "  - Ensure proxy is enabled"
echo "  - Check CloudFlare security rules"
echo ""

echo -e "${GREEN}🎉 Setup Instructions Complete!${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Follow the CloudFlare setup instructions above"
echo "2. Wait for DNS propagation (5-15 minutes)"
echo "3. Test your domain with the commands above"
echo "4. Update your frontend to use the new domain"
echo ""
echo -e "${BLUE}🔗 Useful Links:${NC}"
echo "- CloudFlare Dashboard: https://dash.cloudflare.com"
echo "- CloudFlare Docs: https://developers.cloudflare.com"
echo "- SSL/TLS Guide: https://developers.cloudflare.com/ssl/ssl-modes"
echo ""
echo -e "${GREEN}✅ Happy coding! 🚀${NC}"
