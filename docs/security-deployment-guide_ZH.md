# 安全功能部署指南

本指南說明如何部署和配置 Chainy API 的安全功能，包括 JWT 認證和 WAF 防護。

## 📋 目錄

1. [前置準備](#前置準備)
2. [部署步驟](#部署步驟)
3. [驗證部署](#驗證部署)
4. [測試認證功能](#測試認證功能)
5. [監控和警報](#監控和警報)
6. [故障排除](#故障排除)

## 前置準備

### 1. 確認現有環境

```bash
# 進入 Chainy 目錄
cd /Users/liyu/Programing/aws/chainy

# 確認 Terraform 狀態
terraform state list

# 確認 API Gateway 正常運行
terraform output api_endpoint
```

### 2. 建置 Lambda 函數

```bash
# 安裝依賴
npm install

# 建置所有 Lambda 函數（包括 Authorizer）
npm run package

# 確認建置結果
ls -lh dist/
ls -lh modules/authorizer/build/
```

### 3. 備份現有配置

```bash
# 備份 Terraform 狀態
terraform state pull > terraform-state-backup-$(date +%Y%m%d).json

# 備份現有變數
cp terraform.tfvars terraform.tfvars.backup
```

## 部署步驟

### 階段 1：僅部署 SSM Parameter Store（不啟用認證）

這個階段會創建 JWT 密鑰儲存，但不啟用認證功能。

#### 1.1 更新 terraform.tfvars

```hcl
# terraform.tfvars
environment = "prod"
region      = "ap-northeast-1"

# 安全配置 - 僅創建資源，不啟用
enable_authentication = false
enable_waf           = false

# 可選：自訂 JWT 密鑰（建議留空自動生成）
# jwt_secret = ""

# WAF 配置（預設值）
waf_rate_limit_per_5min = 2000
waf_blocked_countries   = []
```

#### 1.2 初始化並部署

```bash
# 初始化 Terraform（會下載新的 provider）
terraform init

# 查看計劃變更
terraform plan

# 應該看到以下新資源：
# + module.security.aws_ssm_parameter.jwt_secret
# + module.security.aws_wafv2_web_acl.api
# + module.security.aws_cloudwatch_log_group.waf
# 等等...

# 應用變更
terraform apply
```

#### 1.3 驗證 SSM Parameter 創建

```bash
# 獲取 JWT 密鑰參數名稱
terraform output jwt_secret_parameter_name

# 確認參數存在（不顯示值）
aws ssm describe-parameters \
  --parameter-filters "Key=Name,Values=/chainy/prod/jwt-secret"

# 測試讀取（需要適當權限）
aws ssm get-parameter \
  --name "/chainy/prod/jwt-secret" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text
```

### 階段 2：啟用 WAF 防護

#### 2.1 更新配置

```hcl
# terraform.tfvars
enable_waf = true
waf_rate_limit_per_5min = 2000

# 可選：封鎖特定國家
# waf_blocked_countries = ["CN", "RU"]
```

#### 2.2 部署 WAF

```bash
# 查看變更
terraform plan

# 應該看到：
# ~ module.api 會更新以關聯 WAF
# + module.security.aws_wafv2_web_acl_association.api

# 應用變更
terraform apply
```

#### 2.3 驗證 WAF

```bash
# 獲取 WAF Web ACL 信息
terraform output waf_web_acl_name
terraform output waf_web_acl_arn

# 查看 WAF 規則
aws wafv2 get-web-acl \
  --name $(terraform output -raw waf_web_acl_name) \
  --scope REGIONAL \
  --id $(terraform output -raw waf_web_acl_arn | cut -d'/' -f4)

# 測試速率限制（發送多個請求）
for i in {1..10}; do
  curl -X GET "$(terraform output -raw api_endpoint)/test$i"
  echo ""
done
```

### 階段 3：啟用 JWT 認證

#### 3.1 更新配置

```hcl
# terraform.tfvars
enable_authentication = true
enable_waf           = true
```

#### 3.2 部署 Authorizer

```bash
# 確認 authorizer 建置
ls -lh modules/authorizer/build/authorizer.zip

# 查看變更
terraform plan

# 應該看到：
# + module.authorizer[0] 整個模組
# ~ module.api 會更新路由以使用 authorizer

# 應用變更
terraform apply
```

#### 3.3 驗證 Authorizer

```bash
# 獲取 Authorizer 函數名稱
terraform output authorizer_function_name

# 查看 Lambda 函數
aws lambda get-function \
  --function-name $(terraform output -raw authorizer_function_name)

# 查看日誌
aws logs tail "/aws/lambda/$(terraform output -raw authorizer_function_name)" --follow
```

## 驗證部署

### 1. 檢查所有資源

```bash
# 列出所有資源
terraform state list | grep -E "(security|authorizer)"

# 應該看到：
# module.authorizer[0].aws_cloudwatch_log_group.authorizer
# module.authorizer[0].aws_iam_role.authorizer
# module.authorizer[0].aws_lambda_function.authorizer
# module.security.aws_ssm_parameter.jwt_secret
# module.security.aws_wafv2_web_acl.api
# 等等...
```

### 2. 檢查輸出

```bash
# 查看所有輸出
terraform output

# 應該包括：
# api_endpoint
# jwt_secret_parameter_name
# waf_web_acl_name
# authorizer_function_name
# authentication_enabled = true
# waf_enabled = true
```

### 3. 檢查 API Gateway 配置

```bash
# 獲取 API ID
API_ID=$(terraform output -raw api_endpoint | cut -d'.' -f1 | cut -d'/' -f3)

# 列出 Authorizers
aws apigatewayv2 get-authorizers --api-id $API_ID

# 列出 Routes 和它們的授權配置
aws apigatewayv2 get-routes --api-id $API_ID \
  --query 'Items[*].[RouteKey,AuthorizationType,AuthorizerId]' \
  --output table
```

## 測試認證功能

### 1. 生成測試 JWT Token

創建一個測試腳本 `generate-test-token.js`：

```javascript
const jwt = require("jsonwebtoken");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");

async function generateTestToken() {
  // 從 SSM 獲取密鑰
  const ssmClient = new SSMClient({ region: "ap-northeast-1" });
  const response = await ssmClient.send(
    new GetParameterCommand({
      Name: "/chainy/prod/jwt-secret",
      WithDecryption: true,
    })
  );

  const jwtSecret = response.Parameter.Value;

  // 生成測試 token
  const token = jwt.sign(
    {
      sub: "test-user-123",
      email: "test@example.com",
      name: "Test User",
      role: "admin",
    },
    jwtSecret,
    {
      algorithm: "HS256",
      expiresIn: "24h",
    }
  );

  console.log("Test JWT Token:");
  console.log(token);
  return token;
}

generateTestToken().catch(console.error);
```

執行：

```bash
node generate-test-token.js
```

### 2. 測試無 Token 請求（應該失敗）

```bash
API_URL=$(terraform output -raw api_endpoint)

# 嘗試創建短網址（無 token）
curl -X POST "$API_URL/links" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "test123",
    "target": "https://example.com"
  }'

# 預期結果：401 Unauthorized
# {"message":"Unauthorized"}
```

### 3. 測試有效 Token 請求（應該成功）

```bash
# 使用剛才生成的 token
TOKEN="your-test-token-here"

# 創建短網址
curl -X POST "$API_URL/links" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "test123",
    "target": "https://example.com"
  }'

# 預期結果：201 Created
# {"code":"test123","target":"https://example.com",...}
```

### 4. 測試無效 Token（應該失敗）

```bash
# 使用無效的 token
curl -X POST "$API_URL/links" \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "test456",
    "target": "https://example.com"
  }'

# 預期結果：401 Unauthorized
```

### 5. 測試過期 Token（應該失敗）

```javascript
// generate-expired-token.js
const jwt = require("jsonwebtoken");

const token = jwt.sign({ sub: "test-user" }, "your-jwt-secret", {
  algorithm: "HS256",
  expiresIn: "-1h", // 已過期
});

console.log(token);
```

### 6. 測試 Redirect 路由（應該不需要認證）

```bash
# Redirect 路由應該保持公開
curl -I "$API_URL/test123"

# 預期結果：301 或 404（取決於是否存在）
# 不應該返回 401
```

## 監控和警報

### 1. 查看 CloudWatch 指標

```bash
# Authorizer 錯誤
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=$(terraform output -raw authorizer_function_name) \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# WAF 封鎖請求
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=WebACL,Value=$(terraform output -raw waf_web_acl_name) Name=Region,Value=ap-northeast-1 Name=Rule,Value=ALL \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### 2. 查看日誌

```bash
# Authorizer 日誌
aws logs tail "/aws/lambda/$(terraform output -raw authorizer_function_name)" --follow

# WAF 日誌
aws logs tail "/aws/wafv2/chainy-prod" --follow

# API Gateway 日誌（如果啟用）
aws logs tail "/aws/apigateway/chainy-prod-chainy-http" --follow
```

### 3. 設置警報（可選）

CloudWatch 警報已經自動創建：

```bash
# 列出所有警報
aws cloudwatch describe-alarms \
  --alarm-name-prefix "chainy-prod"

# 應該看到：
# - chainy-prod-authorizer-errors
# - chainy-prod-authorizer-throttles
# - chainy-prod-waf-blocked-requests
# - chainy-prod-waf-rate-limit
```

## 故障排除

### 問題 1：Token 驗證失敗

**症狀：** 即使使用有效 token 也返回 401

**檢查步驟：**

```bash
# 1. 確認 Authorizer Lambda 沒有錯誤
aws logs tail "/aws/lambda/$(terraform output -raw authorizer_function_name)" --since 5m

# 2. 確認 SSM parameter 可以被讀取
aws lambda invoke \
  --function-name $(terraform output -raw authorizer_function_name) \
  --payload '{"type":"REQUEST","methodArn":"arn:aws:execute-api:ap-northeast-1:123456789012:abc123/prod/POST/links","headers":{"authorization":"Bearer test"}}' \
  response.json

# 3. 檢查 IAM 權限
aws iam get-role-policy \
  --role-name $(terraform output -raw authorizer_function_name)-role \
  --policy-name $(terraform output -raw authorizer_function_name)-ssm
```

### 問題 2：WAF 誤封鎖合法請求

**症狀：** 正常請求被 WAF 封鎖

**檢查步驟：**

```bash
# 查看 WAF 日誌
aws logs filter-log-events \
  --log-group-name /aws/wafv2/chainy-prod \
  --filter-pattern '{ $.action = "BLOCK" }' \
  --start-time $(date -u -d '1 hour ago' +%s)000

# 調整 WAF 規則（如果需要）
# 編輯 modules/security/main.tf 中的規則配置
```

### 問題 3：部署失敗

**症狀：** `terraform apply` 失敗

**常見原因和解決方案：**

1. **Authorizer ZIP 不存在**

   ```bash
   # 重新建置
   npm run package
   cd dist/authorizer && zip -r ../../modules/authorizer/build/authorizer.zip .
   ```

2. **SSM Parameter 已存在**

   ```bash
   # 檢查現有參數
   aws ssm get-parameter --name "/chainy/prod/jwt-secret"

   # 如果需要，刪除並重新創建
   aws ssm delete-parameter --name "/chainy/prod/jwt-secret"
   ```

3. **IAM 權限不足**
   ```bash
   # 確認您的 AWS 憑證有足夠權限
   aws sts get-caller-identity
   ```

### 問題 4：API Gateway 沒有使用 Authorizer

**檢查步驟：**

```bash
# 確認 enable_authentication = true
terraform output authentication_enabled

# 確認路由配置
API_ID=$(terraform output -raw api_endpoint | cut -d'.' -f1 | cut -d'/' -f3)
aws apigatewayv2 get-routes --api-id $API_ID \
  --query 'Items[*].[RouteKey,AuthorizationType]' \
  --output table

# POST /links 應該顯示 "CUSTOM"
# GET /{code+} 應該顯示 "NONE"
```

## 回滾計劃

如果需要回滾變更：

### 1. 禁用認證和 WAF

```hcl
# terraform.tfvars
enable_authentication = false
enable_waf           = false
```

```bash
terraform apply
```

### 2. 完全移除安全模組

```bash
# 移除 Authorizer
terraform state rm 'module.authorizer[0]'

# 移除安全模組（保留 SSM parameter）
# 編輯 main.tf，註釋掉 module.security 和 module.authorizer

terraform apply
```

### 3. 恢復到之前的狀態

```bash
# 從備份恢復
terraform state push terraform-state-backup-YYYYMMDD.json
```

## 成本影響

啟用這些安全功能的額外成本（估算）：

| 服務                | 月費用       | 說明                |
| ------------------- | ------------ | ------------------- |
| Lambda Authorizer   | < $1         | 按調用次數計費      |
| SSM Parameter Store | 免費         | 標準參數免費        |
| AWS WAF             | $5-10        | $5/WebACL + $1/規則 |
| CloudWatch Logs     | $1-2         | 視日誌量而定        |
| CloudWatch Alarms   | $0.20        | $0.10/警報          |
| **總計**            | **$7-14/月** |                     |

## 下一步

- ✅ 階段 1 完成：JWT 認證和 WAF 已部署
- 📝 接下來：考慮實施階段 2（DynamoDB 加密、S3 加密、CORS 限制等）
- 📚 查看 [JWT 整合指南](./jwt-integration-guide_ZH.md) 了解如何在應用中使用認證

## 相關文檔

- [生產環境安全實施計劃](./production-security-implementation-plan_ZH.md)
- [JWT 整合指南](./jwt-integration-guide_ZH.md)
- [安全審計報告](./security-audit-report_ZH.md)
