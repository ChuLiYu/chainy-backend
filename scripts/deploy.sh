#!/bin/bash

# Chainy 一鍵部署腳本
# 自動化部署整個應用程式

set -e  # 遇到錯誤時停止執行

echo "🚀 開始部署 Chainy 應用程式..."

# 檢查必要工具
echo "🔍 檢查必要工具..."
command -v terraform >/dev/null 2>&1 || { echo "❌ Terraform 未安裝"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI 未安裝"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm 未安裝"; exit 1; }

# 1. 部署基礎設施
echo "🏗️ 部署 AWS 基礎設施..."
cd chainy
terraform init
terraform plan
terraform apply -auto-approve

# 2. 構建前端
echo "🎨 構建前端應用程式..."
cd ../chainy-web
npm install
npm run build

# 3. 部署前端到 S3
echo "📤 部署前端到 S3..."
aws s3 sync dist/ s3://chainy-prod-web --delete

# 4. 清除 CloudFront 緩存
echo "🔄 清除 CloudFront 緩存..."
DISTRIBUTION_ID=$(cd ../chainy && terraform output -raw web_cloudfront_domain | cut -d'.' -f1)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

echo "✅ 部署完成！"
echo "🌐 應用程式網址: https://chainy.luichu.dev"
