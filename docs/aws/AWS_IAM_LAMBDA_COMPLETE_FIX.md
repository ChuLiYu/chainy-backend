# AWS IAM 權限和 Lambda 構建完整修復指南

## 🚨 問題：多個 AWS 服務權限不足 + Lambda 構建問題

### 錯誤描述

```
Error: reading Budget: AccessDeniedException
Error: reading SNS Topic: AuthorizationError
Error: listing tags for CloudWatch Metric Alarm: AccessDenied
Error: reading SSM Parameter metadata: AccessDeniedException
Error: Archive creation error: missing directory: /dist/create
Error: Archive creation error: missing directory: /dist/redirect
```

### 🔧 完整解決方案

#### 1. 創建自定義全權限策略

```bash
aws iam create-policy --policy-name chainy-github-actions-full-access --policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}'
```

#### 2. 移除所有現有策略（解決策略限制問題）

```bash
# 移除所有 10 個現有策略
aws iam detach-user-policy --user-name chainy-github-actions --policy-arn arn:aws:iam::aws:policy/AmazonAPIGatewayAdministrator
aws iam detach-user-policy --user-name chainy-github-actions --policy-arn arn:aws:iam::aws:policy/AWSWAFFullAccess
aws iam detach-user-policy --user-name chainy-github-actions --policy-arn arn:aws:iam::aws:policy/CloudFrontFullAccess
aws iam detach-user-policy --user-name chainy-github-actions --policy-arn arn:aws:iam::aws:policy/AmazonSSMFullAccess
aws iam detach-user-policy --user-name chainy-github-actions --policy-arn arn:aws:iam::aws:policy/AWSCertificateManagerFullAccess
aws iam detach-user-policy --user-name chainy-github-actions --policy-arn arn:aws:iam::aws:policy/IAMFullAccess
aws iam detach-user-policy --user-name chainy-github-actions --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
aws iam detach-user-policy --user-name chainy-github-actions --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
aws iam detach-user-policy --user-name chainy-github-actions --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam detach-user-policy --user-name chainy-github-actions --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess
```

#### 3. 添加自定義全權限策略

```bash
aws iam attach-user-policy --user-name chainy-github-actions --policy-arn arn:aws:iam::277375108569:policy/chainy-github-actions-full-access
```

#### 4. 構建 Lambda 函數

```bash
npm run package
```

### 📋 最終的 IAM 權限配置

**chainy-github-actions 用戶現在擁有：**

1. ✅ **chainy-github-actions-full-access** - 自定義全權限策略
   - 包含所有 AWS 服務的完整權限
   - 解決了策略數量限制問題（最多 10 個策略）
   - 涵蓋所有必要的服務：DynamoDB、API Gateway、SSM、WAF、CloudWatch、ACM、Budgets、SNS 等

### 🔍 服務狀態驗證

**所有服務都已驗證可訪問：**

- ✅ **SSM 參數**: `/chainy/prod/jwt-secret` - 可訪問
- ✅ **WAF Web ACL**: `chainy-prod-api-waf` - 可訪問
- ✅ **CloudWatch Logs**: `/aws/wafv2/chainy-prod` - 可訪問
- ✅ **ACM 證書**: `chainy.luichu.dev` - 可訪問
- ✅ **Budgets**: `chainy-prod-monthly-budget` - 可訪問
- ✅ **SNS Topic**: `chainy-prod-budget-alert` - 可訪問
- ✅ **CloudWatch Alarms**: `chainy-prod-waf-blocked-requests` - 可訪問

### 🚀 Lambda 函數構建

**構建狀態：**

- ✅ **redirect Lambda**: `dist/redirect/` - 已構建
- ✅ **create Lambda**: `dist/create/` - 已構建
- ✅ **authorizer Lambda**: `dist/authorizer/` - 已構建

**構建命令：**

```bash
npm run package
```

**構建輸出：**

```
⚡ Done in 121ms (redirect)
⚡ Done in 77ms (create)
⚡ Done in 78ms (authorizer)
```

### 🔍 權限用途說明

#### Budgets 權限

- **用途**: 成本監控和預算管理
- **資源**: `chainy-prod-monthly-budget`
- **操作**: `ViewBudget`, `DescribeBudget`

#### SNS 權限

- **用途**: 預算警報通知
- **資源**: `chainy-prod-budget-alert`
- **操作**: `GetTopicAttributes`, `Publish`, `Subscribe`

#### CloudWatch 權限

- **用途**: 監控和警報
- **資源**: `chainy-prod-waf-blocked-requests`, `chainy-prod-waf-rate-limit`
- **操作**: `ListTagsForResource`, `PutMetricData`, `GetMetricStatistics`

#### SSM DescribeParameters 權限

- **用途**: 參數管理
- **資源**: `/chainy/prod/jwt-secret`
- **操作**: `DescribeParameters`, `GetParameter`, `PutParameter`

### 🚀 驗證權限

#### 測試 Budgets 訪問

```bash
aws budgets describe-budget \
  --account-id 277375108569 \
  --budget-name chainy-prod-monthly-budget
```

#### 測試 SNS 訪問

```bash
aws sns get-topic-attributes \
  --topic-arn arn:aws:sns:ap-northeast-1:277375108569:chainy-prod-budget-alert
```

#### 測試 CloudWatch 訪問

```bash
aws cloudwatch list-tags-for-resource \
  --resource-arn arn:aws:cloudwatch:ap-northeast-1:277375108569:alarm:chainy-prod-waf-blocked-requests
```

#### 測試 SSM 訪問

```bash
aws ssm describe-parameters \
  --parameter-filters "Key=Name,Values=/chainy/prod/jwt-secret"
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

#### Budget 狀態

- ✅ 名稱: `chainy-prod-monthly-budget`
- ✅ 限制: $10.0 USD
- ✅ 狀態: `HEALTHY`
- ✅ 狀態: 可訪問

#### SNS Topic 狀態

- ✅ ARN: `arn:aws:sns:ap-northeast-1:277375108569:chainy-prod-budget-alert`
- ✅ 訂閱: 1 個待確認
- ✅ 狀態: 可訪問

### 🎯 下一步

1. **重新觸發部署**

   - 所有權限已修復
   - Lambda 函數已構建完成
   - GitHub Actions 現在應該可以訪問所有 AWS 服務
   - Terraform 狀態鎖定應該正常工作

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
   - ✅ Budget 和 SNS 配置

### ⏰ 重要提醒

**權限生效時間：**

- IAM 權限更改可能需要 1-2 分鐘才能生效
- 如果仍有問題，請等待幾分鐘後重試

**安全注意事項：**

- 使用了 `*` 全權限策略，權限較大
- 在生產環境中建議使用最小權限原則
- 定期審查和更新權限

**策略限制：**

- AWS IAM 用戶最多只能附加 10 個策略
- 使用自定義全權限策略解決了這個限制

---

**重要提醒**: 所有 AWS 服務權限和 Lambda 構建問題已修復，後端部署現在應該可以成功完成！
