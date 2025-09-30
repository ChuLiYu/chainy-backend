#!/bin/bash

# Chainy SSM Parameter Setup Script
# This script helps you set up SSM parameters for Chainy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Chainy SSM Parameter Setup${NC}"
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

# Get current AWS account and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)
echo -e "${BLUE}📋 Account ID: ${ACCOUNT_ID}${NC}"
echo -e "${BLUE}📋 Region: ${REGION}${NC}"

# Default parameter names
DEFAULT_HASH_SALT_PARAM="/chainy/dev/hash-salt"
DEFAULT_IP_HASH_SALT_PARAM="/chainy/dev/ip-hash-salt"

echo ""
echo -e "${YELLOW}🔑 Setting up SSM Parameters${NC}"
echo "================================"

# Function to generate random salt
generate_salt() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to set SSM parameter
set_ssm_parameter() {
    local param_name="$1"
    local param_value="$2"
    local description="$3"
    
    echo -e "${BLUE}📝 Setting parameter: ${param_name}${NC}"
    
    if aws ssm get-parameter --name "$param_name" &> /dev/null; then
        echo -e "${YELLOW}⚠️  Parameter already exists. Updating...${NC}"
        aws ssm put-parameter \
            --name "$param_name" \
            --value "$param_value" \
            --type "SecureString" \
            --description "$description" \
            --overwrite
    else
        echo -e "${GREEN}✅ Creating new parameter...${NC}"
        aws ssm put-parameter \
            --name "$param_name" \
            --value "$param_value" \
            --type "SecureString" \
            --description "$description"
    fi
}

# Generate salts
echo -e "${BLUE}🎲 Generating secure salts...${NC}"
HASH_SALT=$(generate_salt)
IP_HASH_SALT=$(generate_salt)

echo -e "${GREEN}✅ Generated hash salt: ${HASH_SALT:0:8}...${NC}"
echo -e "${GREEN}✅ Generated IP hash salt: ${IP_HASH_SALT:0:8}...${NC}"

# Set SSM parameters
set_ssm_parameter "$DEFAULT_HASH_SALT_PARAM" "$HASH_SALT" "Chainy hash salt for URL hashing"
set_ssm_parameter "$DEFAULT_IP_HASH_SALT_PARAM" "$IP_HASH_SALT" "Chainy IP hash salt for IP address hashing"

echo ""
echo -e "${GREEN}🎉 SSM Parameters Setup Complete!${NC}"
echo "=================================="

echo -e "${BLUE}📋 Summary:${NC}"
echo -e "  Hash Salt Parameter: ${DEFAULT_HASH_SALT_PARAM}"
echo -e "  IP Hash Salt Parameter: ${DEFAULT_IP_HASH_SALT_PARAM}"
echo ""

echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Update your terraform.tfvars file with these parameter names"
echo "2. Run 'terraform plan' to verify the configuration"
echo "3. Run 'terraform apply' to deploy the infrastructure"
echo ""

echo -e "${BLUE}🔍 To verify parameters were created:${NC}"
echo "aws ssm get-parameter --name '$DEFAULT_HASH_SALT_PARAM' --with-decryption"
echo "aws ssm get-parameter --name '$DEFAULT_IP_HASH_SALT_PARAM' --with-decryption"
echo ""

echo -e "${GREEN}✅ Setup complete!${NC}"
