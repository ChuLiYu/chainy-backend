#!/bin/bash

# AWS 權限驗證腳本
# 驗證 Lambda 函數是否有正確的 IAM 權限

echo "🔍 驗證 AWS 權限配置..."

# 檢查 Create Lambda 的 DynamoDB 權限
echo "📊 檢查 Create Lambda DynamoDB 權限："
aws iam get-role-policy \
  --role-name chainy-prod-chainy-create-role \
  --policy-name chainy-prod-chainy-create-policy \
  --query 'PolicyDocument.Statement[0].Action' \
  --output table

# 檢查 Redirect Lambda 的 DynamoDB 權限
echo "📊 檢查 Redirect Lambda DynamoDB 權限："
aws iam get-role-policy \
  --role-name chainy-prod-chainy-redirect-role \
  --policy-name chainy-prod-chainy-redirect-policy \
  --query 'PolicyDocument.Statement[0].Action' \
  --output table

# 檢查 Google Auth Lambda 的權限
echo "📊 檢查 Google Auth Lambda 權限："
aws iam get-role-policy \
  --role-name chainy-prod-google-auth-role \
  --policy-name chainy-prod-google-auth-policy \
  --query 'PolicyDocument.Statement[*].Action' \
  --output table

echo "✅ 權限驗證完成！"
