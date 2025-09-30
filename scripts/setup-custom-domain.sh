#!/bin/bash

# Chainy Custom Domain Setup Script
# This script helps you set up chainy.luichu.dev domain

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌐 Chainy Custom Domain Setup${NC}"
echo "=================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI is configured${NC}"

# Domain configuration
DOMAIN="luichu.dev"
SUBDOMAIN="chainy"
FULL_DOMAIN="${SUBDOMAIN}.${DOMAIN}"

echo -e "${BLUE}📋 Domain: ${FULL_DOMAIN}${NC}"

# Check if Hosted Zone exists
echo -e "${BLUE}🔍 Checking for existing Hosted Zone...${NC}"
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='${DOMAIN}.'].Id" --output text | sed 's|/hostedzone/||')

if [ -z "$HOSTED_ZONE_ID" ]; then
    echo -e "${YELLOW}⚠️  No Hosted Zone found for ${DOMAIN}${NC}"
    echo -e "${BLUE}📝 Creating Hosted Zone...${NC}"
    
    # Create Hosted Zone
    CALLER_REFERENCE="chainy-setup-$(date +%s)"
    HOSTED_ZONE_ID=$(aws route53 create-hosted-zone \
        --name "$DOMAIN" \
        --caller-reference "$CALLER_REFERENCE" \
        --hosted-zone-config Comment="Hosted zone for ${DOMAIN} created by Chainy setup" \
        --query "HostedZone.Id" --output text | sed 's|/hostedzone/||')
    
    echo -e "${GREEN}✅ Created Hosted Zone: ${HOSTED_ZONE_ID}${NC}"
    
    # Get Name Servers
    echo -e "${BLUE}📋 Name Servers for ${DOMAIN}:${NC}"
    aws route53 get-hosted-zone --id "$HOSTED_ZONE_ID" --query "DelegationSet.NameServers" --output table
    
    echo -e "${YELLOW}⚠️  IMPORTANT: You need to update your DNS provider with these Name Servers!${NC}"
    echo -e "${YELLOW}   Please update your domain registrar to use these Name Servers for ${DOMAIN}${NC}"
    
else
    echo -e "${GREEN}✅ Found existing Hosted Zone: ${HOSTED_ZONE_ID}${NC}"
fi

# Update terraform.tfvars
echo -e "${BLUE}📝 Updating terraform.tfvars...${NC}"

# Create backup
cp terraform.tfvars terraform.tfvars.backup

# Update terraform.tfvars
cat > terraform.tfvars << EOF
# Environment name (dev, staging, prod)
environment = "dev"

# AWS region for resources
region = "ap-northeast-1"

# SSM parameter names for hashing salts
hash_salt_parameter_name    = "/chainy/dev/hash-salt"
ip_hash_salt_parameter_name = "/chainy/dev/ip-hash-salt"

# Fallback values for SSM parameters (used if SSM fails)
hash_salt_fallback    = "rSG/!F/Nw00)5ZMxOdM/MSMW=U-IUw51C"
ip_hash_salt_fallback = "0(Hsev@sCf1_98bZRB.lFnz98nGOP2TW"

# Lambda environment variables (additional)
lambda_additional_environment = {}

# Domain configuration
web_domain         = "${DOMAIN}"
web_subdomain      = "${SUBDOMAIN}"
web_hosted_zone_id = "${HOSTED_ZONE_ID}"
web_price_class    = "PriceClass_100"

# Optional: Additional tags for all resources
extra_tags = {
  Project     = "chainy"
  Environment = "dev"
  ManagedBy   = "terraform"
}
EOF

echo -e "${GREEN}✅ Updated terraform.tfvars${NC}"

# Validate Terraform configuration
echo -e "${BLUE}🔍 Validating Terraform configuration...${NC}"
if terraform validate; then
    echo -e "${GREEN}✅ Terraform configuration is valid${NC}"
else
    echo -e "${RED}❌ Terraform validation failed${NC}"
    echo -e "${YELLOW}⚠️  Restoring backup...${NC}"
    mv terraform.tfvars.backup terraform.tfvars
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Domain Setup Complete!${NC}"
echo "=================================="

echo -e "${BLUE}📋 Summary:${NC}"
echo -e "  Domain: ${FULL_DOMAIN}"
echo -e "  Hosted Zone ID: ${HOSTED_ZONE_ID}"
echo -e "  Terraform config: Updated"
echo ""

echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Update your domain registrar with the Name Servers (if new Hosted Zone)"
echo "2. Run 'terraform plan' to review changes"
echo "3. Run 'terraform apply' to deploy the infrastructure"
echo "4. Wait for DNS propagation (5-15 minutes)"
echo "5. Test your domain: https://${FULL_DOMAIN}"
echo ""

echo -e "${BLUE}🔍 To verify DNS setup:${NC}"
echo "dig ${FULL_DOMAIN}"
echo "nslookup ${FULL_DOMAIN}"
echo ""

echo -e "${BLUE}🧪 To test after deployment:${NC}"
echo "curl -I https://${FULL_DOMAIN}"
echo ""

echo -e "${GREEN}✅ Setup complete!${NC}"
