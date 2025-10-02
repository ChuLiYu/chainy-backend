# AWS IAM 權限修復指南

## 🚨 問題：DynamoDB 權限不足

### 錯誤描述

```
Error: Error acquiring the state lock
AccessDeniedException: User: arn:aws:iam::277375108569:user/chainy-github-actions
is not authorized to perform: dynamodb:PutItem on resource:
arn:aws:dynamodb:ap-northeast-1:277375108569:table/chainy-terraform-locks
```

### 🔧 解決方案

#### 1. 添加 DynamoDB 權限

```bash
aws iam attach-user-policy \
  --user-name chainy-github-actions \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
```

#### 2. 添加 API Gateway 權限

```bash
aws iam attach-user-policy \
  --user-name chainy-github-actions \
  --policy-arn arn:aws:iam::aws:policy/AmazonAPIGatewayAdministrator
```

### 📋 完整的 IAM 權限清單

**chainy-github-actions 用戶現在擁有以下權限：**

1. ✅ **CloudFrontFullAccess** - CloudFront CDN 管理
2. ✅ **IAMFullAccess** - IAM 用戶和策略管理
3. ✅ **AmazonDynamoDBFullAccess** - DynamoDB 數據庫管理
4. ✅ **AmazonS3FullAccess** - S3 存儲管理
5. ✅ **AWSLambda_FullAccess** - Lambda 函數管理
6. ✅ **AmazonAPIGatewayAdministrator** - API Gateway 管理

### 🔍 權限用途說明

#### DynamoDB 權限

- **用途**: Terraform 狀態鎖定
- **表**: `chainy-terraform-locks`
- **操作**: `PutItem`, `GetItem`, `DeleteItem`

#### API Gateway 權限

- **用途**: 創建和管理 REST API
- **操作**: 創建 API、部署、管理路由

#### Lambda 權限

- **用途**: 部署和更新 Lambda 函數
- **操作**: 創建、更新、刪除函數

#### S3 權限

- **用途**: Terraform 狀態存儲
- **操作**: 讀取和寫入狀態文件

#### CloudFront 權限

- **用途**: CDN 緩存管理
- **操作**: 創建分發、緩存失效

### 🚀 驗證權限

#### 測試 DynamoDB 訪問

```bash
aws dynamodb describe-table \
  --table-name chainy-terraform-locks \
  --region ap-northeast-1
```

#### 測試 S3 訪問

```bash
aws s3 ls s3://chainy-terraform-state-lui-20240930/
```

#### 測試 Lambda 訪問

```bash
aws lambda list-functions --region ap-northeast-1
```

### 📝 最佳實踐

#### 最小權限原則

雖然我們使用了 `FullAccess` 策略，但在生產環境中建議：

1. 創建自定義 IAM 策略
2. 只授予必要的權限
3. 定期審查和更新權限

#### 自定義策略示例

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"],
      "Resource": "arn:aws:dynamodb:ap-northeast-1:277375108569:table/chainy-terraform-locks"
    }
  ]
}
```

### 🎯 下一步

1. **重新觸發部署**

   - GitHub Actions 現在應該可以訪問 DynamoDB
   - Terraform 狀態鎖定應該正常工作

2. **監控部署**

   - 檢查是否還有其他權限問題
   - 確認所有 AWS 服務都可以正常訪問

3. **測試功能**
   - 部署完成後測試 API 端點
   - 驗證 Google OAuth 認證

---

**重要提醒**: 權限更改可能需要幾分鐘才能生效。如果仍有問題，請等待幾分鐘後重試。
