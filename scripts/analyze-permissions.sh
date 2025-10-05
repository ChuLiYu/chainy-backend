#!/bin/bash

# AWS 權限自動檢測腳本
# 分析 Lambda 代碼並生成所需的 IAM 權限

echo "🔍 分析 Lambda 函數的 AWS 權限需求..."

# 分析 create.ts 中的 DynamoDB 操作
echo "📊 DynamoDB 操作分析："
grep -n "Command\|dynamodb:" /Users/liyu/Programing/aws/chainy/handlers/create.ts | grep -E "(GetCommand|PutCommand|UpdateCommand|DeleteCommand|ScanCommand)"

# 分析 S3 操作
echo "📊 S3 操作分析："
grep -n "s3:\|S3" /Users/liyu/Programing/aws/chainy/handlers/create.ts

# 分析 SSM 操作
echo "📊 SSM 操作分析："
grep -n "ssm:\|SSM" /Users/liyu/Programing/aws/chainy/handlers/create.ts

echo "✅ 權限分析完成！"
