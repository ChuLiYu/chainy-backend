#!/bin/bash

# Google OAuth Client Secret Update Script
# Used to fix "Invalid OAuth code" error

set -e

echo "🔧 Google OAuth Client Secret Update Tool"
echo "========================================"

# Check current configuration
echo "📋 Checking current configuration..."
CURRENT_SECRET=$(aws lambda get-function-configuration \
  --function-name chainy-prod-google-auth \
  --region ap-northeast-1 \
  --query 'Environment.Variables.GOOGLE_CLIENT_SECRET' \
  --output text)

echo "Current Client Secret: $CURRENT_SECRET"

if [[ "$CURRENT_SECRET" == "GOCSPX-your_google_client_secret_here" ]]; then
    echo "❌ Placeholder value detected, update required"
else
    echo "✅ Client Secret is configured"
    exit 0
fi

echo ""
echo "📝 Please follow these steps to get the correct Google OAuth Client Secret:"
echo "1. Go to https://console.cloud.google.com/"
echo "2. Select your project"
echo "3. Navigate to APIs & Services > Credentials"
echo "4. Find client ID: 1079648073253-kueo7mpri415h10dsc0fldeoecp878l6.apps.googleusercontent.com"
echo "5. Click to view details"
echo "6. Copy the Client Secret (format: GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx)"
echo ""

# Prompt user for new secret
read -p "Please enter the new Google OAuth Client Secret: " NEW_SECRET

if [[ -z "$NEW_SECRET" ]]; then
    echo "❌ No secret entered, operation cancelled"
    exit 1
fi

if [[ ! "$NEW_SECRET" =~ ^GOCSPX- ]]; then
    echo "⚠️  Warning: Secret format may be incorrect (should start with GOCSPX-)"
    read -p "Continue anyway? (y/N): " CONFIRM
    if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
        echo "Operation cancelled"
        exit 1
    fi
fi

echo ""
echo "🔄 Updating Terraform configuration..."

# Backup original file
cp terraform.tfvars terraform.tfvars.backup.$(date +%Y%m%d_%H%M%S)

# Update configuration
sed -i.bak "s/google_client_secret = \"GOCSPX-your_google_client_secret_here\"/google_client_secret = \"$NEW_SECRET\"/" terraform.tfvars

echo "✅ Terraform configuration updated"

echo ""
echo "🚀 Redeploying Lambda function..."
terraform apply -auto-approve

echo ""
echo "✅ Fix completed!"
echo "You can now test the Google login functionality again"

# Verify update
echo ""
echo "🔍 Verifying update..."
UPDATED_SECRET=$(aws lambda get-function-configuration \
  --function-name chainy-prod-google-auth \
  --region ap-northeast-1 \
  --query 'Environment.Variables.GOOGLE_CLIENT_SECRET' \
  --output text)

if [[ "$UPDATED_SECRET" == "$NEW_SECRET" ]]; then
    echo "✅ Lambda environment variables successfully updated"
else
    echo "❌ Lambda environment variables update failed"
    exit 1
fi

echo ""
echo "🎉 Google OAuth fix completed!"
echo "Please test your application again"
