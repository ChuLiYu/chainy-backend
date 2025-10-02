#!/bin/bash

# Production Deployment Script for Chainy
# Updates configuration for live deployment at https://chainy.luichu.dev

set -e

echo "🚀 Chainy Production Deployment Script"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "chainy/terraform.tfvars" ]; then
    echo "❌ Error: Please run this script from the aws directory"
    exit 1
fi

echo "📋 Pre-deployment checks..."

# Verify Google OAuth configuration
echo "🔍 Checking Google OAuth configuration..."
REDIRECT_URI=$(grep "google_redirect_uri" chainy/terraform.tfvars | cut -d'"' -f2)
if [ "$REDIRECT_URI" != "https://chainy.luichu.dev" ]; then
    echo "❌ Google redirect URI is not set to production URL: $REDIRECT_URI"
    exit 1
fi
echo "✅ Google redirect URI configured correctly: $REDIRECT_URI"

# Check if Google Client Secret is not placeholder
CLIENT_SECRET=$(grep "google_client_secret" chainy/terraform.tfvars | cut -d'"' -f2)
if [ "$CLIENT_SECRET" = "GOCSPX-your_google_client_secret_here" ]; then
    echo "❌ Google Client Secret is still placeholder value"
    echo "Please run ./fix-google-oauth.sh first"
    exit 1
fi
echo "✅ Google Client Secret configured"

echo ""
echo "🔄 Deploying backend infrastructure..."

# Deploy backend
cd chainy
terraform plan -out=production.tfplan
echo "📋 Terraform plan created. Review the changes above."
read -p "Continue with deployment? (y/N): " CONFIRM

if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
    terraform apply production.tfplan
    echo "✅ Backend deployed successfully"
else
    echo "❌ Deployment cancelled"
    exit 1
fi

cd ..

echo ""
echo "🌐 Deploying frontend..."

# Build and deploy frontend
cd chainy-web
npm run build

# Get S3 bucket name from Terraform output
S3_BUCKET=$(cd ../chainy && terraform output -raw web_bucket_name 2>/dev/null || echo "chainy-prod-web")

echo "📦 Uploading to S3 bucket: $S3_BUCKET"

# Upload to S3
aws s3 sync dist/ s3://$S3_BUCKET/ --delete

# Invalidate CloudFront cache
CLOUDFRONT_ID=$(cd ../chainy && terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
if [ -n "$CLOUDFRONT_ID" ]; then
    echo "🔄 Invalidating CloudFront cache..."
    aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"
fi

cd ..

echo ""
echo "🎉 Production deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update Google Cloud Console OAuth settings:"
echo "   - Add authorized redirect URI: https://chainy.luichu.dev"
echo "   - Add authorized JavaScript origins: https://chainy.luichu.dev"
echo ""
echo "2. Test the application:"
echo "   - Visit: https://chainy.luichu.dev"
echo "   - Test Google login functionality"
echo "   - Verify URL shortening works"
echo ""
echo "3. Monitor the application:"
echo "   - Check CloudWatch logs"
echo "   - Monitor Lambda function performance"
echo "   - Verify cost alerts are working"
echo ""
echo "🔗 Your application is now live at: https://chainy.luichu.dev"
