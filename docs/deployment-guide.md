# Chainy 快速部署指南

## 🚀 部署步驟

### 1. 設定 SSM 參數

執行 SSM 參數設定腳本：

```bash
./scripts/setup-ssm-parameters.sh
```

這個腳本會：
- 檢查 AWS CLI 配置
- 生成安全的雜湊鹽值
- 在 SSM Parameter Store 中建立參數
- 提供驗證指令

### 2. 驗證 Terraform 配置

```bash
terraform validate
```

### 3. 初始化 Terraform

```bash
terraform init -upgrade
```

### 4. 檢視部署計劃

```bash
terraform plan
```

### 5. 部署基礎設施

```bash
terraform apply
```

### 6. 獲取 API Key

部署完成後，獲取 API Key：

```bash
terraform output -raw api_key_value
```

## 🔧 配置說明

### terraform.tfvars 範例

```hcl
# Environment name (dev, staging, prod)
environment = "dev"

# AWS region for resources
region = "ap-northeast-1"

# SSM parameter names for hashing salts
hash_salt_parameter_name    = "/chainy/dev/hash-salt"
ip_hash_salt_parameter_name = "/chainy/dev/ip-hash-salt"

# Fallback values for SSM parameters (used if SSM fails)
hash_salt_fallback    = "your-fallback-hash-salt"
ip_hash_salt_fallback = "your-fallback-ip-salt"

# Lambda environment variables (additional)
lambda_additional_environment = {}

# Optional: Additional tags for all resources
extra_tags = {
  Project     = "chainy"
  Environment = "dev"
  ManagedBy   = "terraform"
}
```

## 🔐 安全功能

### API 認證
- CRUD 端點需要 API Key 認證
- 重定向端點保持公開
- Rate limiting: 50 requests/second, 100 burst
- 每日配額: 10,000 requests

### SSM 參數管理
- 雜湊鹽值儲存在 SSM Parameter Store
- 使用 SecureString 類型加密
- 5分鐘快取機制
- 失敗時回退到環境變數

## 📊 監控和日誌

### CloudWatch 日誌
- Lambda 函數日誌保留 14 天
- 自動建立日誌群組
- 結構化日誌輸出

### 建議的監控指標
- Lambda 錯誤率
- API Gateway 4XX/5XX 錯誤
- DynamoDB 讀寫容量
- S3 事件儲存量

## 🧪 測試部署

### 1. 測試 API 端點

```bash
# 獲取 API 端點
API_ENDPOINT=$(terraform output -raw api_endpoint)
API_KEY=$(terraform output -raw api_key_value)

# 測試建立短連結
curl -X POST "$API_ENDPOINT/links" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "code": "test123"}'

# 測試重定向（不需要 API Key）
curl -I "$API_ENDPOINT/test123"
```

### 2. 驗證 SSM 參數

```bash
aws ssm get-parameter --name "/chainy/dev/hash-salt" --with-decryption
aws ssm get-parameter --name "/chainy/dev/ip-hash-salt" --with-decryption
```

## 🔄 更新和維護

### 更新雜湊鹽值

```bash
# 生成新的鹽值
NEW_SALT=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# 更新 SSM 參數
aws ssm put-parameter \
  --name "/chainy/dev/hash-salt" \
  --value "$NEW_SALT" \
  --type "SecureString" \
  --overwrite
```

### 重新部署 Lambda

```bash
# 重新建置 Lambda 函數
npm run build

# 重新部署
terraform apply -target=module.lambda
```

## 🚨 故障排除

### 常見問題

1. **SSM 參數不存在**
   - 執行 `./scripts/setup-ssm-parameters.sh`
   - 檢查 IAM 權限

2. **API Key 認證失敗**
   - 確認 API Key 正確
   - 檢查 Usage Plan 配置

3. **Lambda 超時**
   - 檢查 SSM 參數存取
   - 增加 Lambda 超時時間

4. **DynamoDB 錯誤**
   - 檢查 IAM 權限
   - 確認表格存在

### 日誌檢查

```bash
# Lambda 日誌
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/chainy"

# API Gateway 日誌
aws logs describe-log-groups --log-group-name-prefix "/aws/apigateway"
```

## 📈 效能優化

### Lambda 配置
- 記憶體: 128MB (redirect), 256MB (create)
- 超時: 3秒 (redirect), 10秒 (create)
- 並發限制: 預設無限制

### DynamoDB 配置
- 按需計費模式
- 自動擴展
- 全域二級索引支援

### S3 配置
- 標準儲存類別
- 30天生命週期過期
- 伺服器端加密

## 🔒 安全最佳實踐

1. **定期輪換 API Key**
2. **監控異常存取模式**
3. **使用 WAF 防護**
4. **啟用 CloudTrail 審計**
5. **定期更新依賴套件**

## 📞 支援

如有問題，請檢查：
1. Terraform 狀態檔案
2. CloudWatch 日誌
3. AWS 服務健康狀態
4. IAM 權限配置
