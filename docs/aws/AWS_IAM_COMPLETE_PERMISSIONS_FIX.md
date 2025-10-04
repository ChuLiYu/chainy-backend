# AWS IAM 權限完整修復指南

## 🚨 問題：多個 AWS 服務權限不足

### 錯誤描述

```
Error: reading SSM Parameter (/chainy/prod/jwt-secret): AccessDeniedException
Error: listing tags for WAF Web ACL: AccessDeniedException
Error: listing tags for CloudWatch Logs Log Group: AccessDeniedException
Error: listing tags for ACM Certificate: AccessDeniedException
```

### 🔧 完整解決方案

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

#### 3. 添加 SSM (Systems Manager) 權限

```bash
aws iam attach-user-policy \
  --user-name chainy-github-actions \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMFullAccess
```

#### 4. 添加 WAF (Web Application Firewall) 權限

```bash
aws iam attach-user-policy \
  --user-name chainy-github-actions \
  --policy-arn arn:aws:iam::aws:policy/AWSWAFFullAccess
```

#### 5. 添加 CloudWatch Logs 權限

```bash
aws iam attach-user-policy \
  --user-name chainy-github-actions \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
```

#### 6. 添加 ACM (Certificate Manager) 權限

```bash
aws iam attach-user-policy \
  --user-name chainy-github-actions \
  --policy-arn arn:aws:iam::aws:policy/AWSCertificateManagerFullAccess
```

### 📋 完整的 IAM 權限清單

**chainy-github-actions 用戶現在擁有以下權限：**

1. ✅ **CloudFrontFullAccess** - CloudFront CDN 管理
2. ✅ **IAMFullAccess** - IAM 用戶和策略管理
3. ✅ **AmazonDynamoDBFullAccess** - DynamoDB 數據庫管理
4. ✅ **AmazonS3FullAccess** - S3 存儲管理
5. ✅ **AWSLambda_FullAccess** - Lambda 函數管理
6. ✅ **AmazonAPIGatewayAdministrator** - API Gateway 管理
7. ✅ **AmazonSSMFullAccess** - Systems Manager 參數管理
8. ✅ **AWSWAFFullAccess** - Web Application Firewall 管理
9. ✅ **CloudWatchLogsFullAccess** - CloudWatch Logs 管理
10. ✅ **AWSCertificateManagerFullAccess** - SSL 證書管理

### 🔍 權限用途說明

#### SSM (Systems Manager) 權限

- **用途**: 存儲和管理 JWT 密鑰
- **參數**: `/chainy/prod/jwt-secret`
- **操作**: `GetParameter`, `PutParameter`, `DeleteParameter`

#### WAF (Web Application Firewall) 權限

- **用途**: API Gateway 安全防護
- **資源**: `chainy-prod-api-waf`
- **操作**: `ListTagsForResource`, `CreateWebACL`, `UpdateWebACL`

#### CloudWatch Logs 權限

- **用途**: WAF 日誌記錄
- **日誌組**: `/aws/wafv2/chainy-prod`
- **操作**: `ListTagsForResource`, `CreateLogGroup`, `PutLogEvents`

#### ACM (Certificate Manager) 權限

- **用途**: SSL 證書管理
- **證書**: `chainy.luichu.dev`
- **操作**: `ListTagsForCertificate`, `RequestCertificate`, `DescribeCertificate`

### 🚀 驗證權限

#### 測試 SSM 訪問

```bash
aws ssm get-parameter \
  --name "/chainy/prod/jwt-secret" \
  --region ap-northeast-1 \
  --with-decryption
```

#### 測試 WAF 訪問

```bash
aws wafv2 list-web-acls \
  --scope REGIONAL \
  --region ap-northeast-1
```

#### 測試 CloudWatch Logs 訪問

```bash
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/wafv2/chainy-prod" \
  --region ap-northeast-1
```

#### 測試 ACM 訪問

```bash
aws acm list-certificates \
  --region us-east-1
```

### 📊 服務狀態驗證

#### SSM 參數狀態

- ✅ 參數名: `/chainy/prod/jwt-secret`
- ✅ 類型: `SecureString`
- ✅ 狀態: 可訪問

#### WAF Web ACL 狀態

- ✅ 名稱: `chainy-prod-api-waf`
- ✅ ID: `cf444a4a-4b1b-4965-a919-d8389c84fc64`
- ✅ 狀態: 可訪問

#### CloudWatch Logs 狀態

- ✅ 日誌組: `/aws/wafv2/chainy-prod`
- ✅ 保留期: 1 天
- ✅ 狀態: 可訪問

#### ACM 證書狀態

- ✅ 域名: `chainy.luichu.dev`
- ✅ 狀態: `ISSUED`
- ✅ 有效期: 2026-10-30
- ✅ 狀態: 可訪問

### 🎯 下一步

1. **重新觸發部署**

   - 所有權限已修復
   - GitHub Actions 現在應該可以訪問所有 AWS 服務
   - Terraform 應該可以成功執行

2. **監控部署進度**

   - 前往 `https://github.com/ChuLiYu/chainy-backend/actions`
   - 查看 "Deploy Backend" 工作流程
   - 應該不再出現權限錯誤

3. **預期的成功流程**
   - ✅ Terraform Init
   - ✅ Terraform Plan
   - ✅ Terraform Apply
   - ✅ Lambda 函數部署
   - ✅ API Gateway 配置
   - ✅ DynamoDB 表創建
   - ✅ WAF 規則配置
   - ✅ SSL 證書驗證

### ⏰ 重要提醒

**權限生效時間：**

- IAM 權限更改可能需要 1-2 分鐘才能生效
- 如果仍有問題，請等待幾分鐘後重試

**安全注意事項：**

- 這些是 `FullAccess` 策略，權限較大
- 在生產環境中建議使用最小權限原則
- 定期審查和更新權限

---

**重要提醒**: 所有 AWS 服務權限已修復，後端部署現在應該可以成功完成！
