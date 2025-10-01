#!/bin/bash

# Chainy Frontend Deployment Script
# 簡化版本 - 不需要自定義域名

set -e

echo "🚀 Chainy Frontend Deployment"
echo "=================================="

# 檢查 AWS CLI 配置
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI 未配置或憑證無效"
    exit 1
fi
echo "✅ AWS CLI is configured"

# 獲取 API 端點
echo "🔍 Getting API endpoint from backend..."
API_ENDPOINT=$(cd /Users/liyu/Programing/aws/chainy && terraform output -raw api_endpoint)
echo "✅ API Gateway endpoint: $API_ENDPOINT"

# 生成唯一的 S3 桶名稱
BUCKET_NAME="chainy-prod-web-$(date +%s)"
echo "📦 Creating S3 bucket: $BUCKET_NAME"

# 創建 S3 桶
aws s3 mb "s3://$BUCKET_NAME" --region ap-northeast-1

# 配置 S3 桶用於靜態網站託管
echo "⚙️  Configuring S3 bucket for static website hosting..."
aws s3 website "s3://$BUCKET_NAME" \
    --index-document index.html \
    --error-document index.html

# 禁用公共訪問阻止設置
echo "🔓 Disabling block public access settings..."
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# 設置桶策略允許公共讀取
echo "🔒 Setting bucket policy for public read access..."
cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file:///tmp/bucket-policy.json
rm /tmp/bucket-policy.json

# 構建前端
echo "🔨 Building frontend..."

# 更新 script.js 中的 API 端點
cd /Users/liyu/Programing/aws/chainy/web
cp script.js script.js.backup
sed -i '' "s|https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com|$API_ENDPOINT|g" script.js

echo "✅ Frontend built successfully"

# 上傳文件到 S3
echo "📤 Uploading files to S3..."
aws s3 sync . "s3://$BUCKET_NAME" \
    --exclude "*.backup" \
    --exclude "*.md" \
    --exclude ".git/*" \
    --region ap-northeast-1

# 恢復原始文件
mv script.js.backup script.js

# 獲取網站 URL
WEBSITE_URL="http://$BUCKET_NAME.s3-website-ap-northeast-1.amazonaws.com"

echo ""
echo "🎉 Frontend deployment completed!"
echo "=================================="
echo "📱 Website URL: $WEBSITE_URL"
echo "🔗 API Endpoint: $API_ENDPOINT"
echo ""
echo "💡 注意事項："
echo "   - 這是 HTTP 網站（非 HTTPS）"
echo "   - 如果需要 HTTPS，需要配置 CloudFront 和自定義域名"
echo "   - 可以通過 CloudFlare 免費方案添加 HTTPS"
echo ""
echo "🧪 測試命令："
echo "   curl -I $WEBSITE_URL"
echo "   open $WEBSITE_URL"
