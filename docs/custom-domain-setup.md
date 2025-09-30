# Chainy 自訂網域設定指南

## 🌐 設定 chainy.luichu.dev 網域

### 步驟 1: 檢查 Route 53 Hosted Zone

首先檢查您是否已經有 `luichu.dev` 的 Hosted Zone：

```bash
aws route53 list-hosted-zones --query "HostedZones[?Name=='luichu.dev.'].{Name:Name,Id:Id}" --output table
```

### 步驟 2: 如果沒有 Hosted Zone，需要建立

```bash
# 建立 luichu.dev 的 Hosted Zone
aws route53 create-hosted-zone \
  --name luichu.dev \
  --caller-reference $(date +%s) \
  --hosted-zone-config Comment="Hosted zone for luichu.dev"
```

### 步驟 3: 獲取 Hosted Zone ID

```bash
# 獲取 Hosted Zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='luichu.dev.'].Id" --output text | sed 's|/hostedzone/||')
echo "Hosted Zone ID: $HOSTED_ZONE_ID"
```

### 步驟 4: 更新 terraform.tfvars

將獲取到的 Hosted Zone ID 更新到 `terraform.tfvars`：

```hcl
# Optional: Configure front-end hosting (CloudFront + S3)
web_domain         = "luichu.dev"
web_subdomain      = "chainy"
web_hosted_zone_id = "Z1234567890ABCDEFG" # 替換為實際的 Hosted Zone ID
web_price_class    = "PriceClass_100"
```

### 步驟 5: 更新 DNS 設定

如果您使用外部 DNS 提供商（如 Cloudflare、GoDaddy 等），需要：

1. **獲取 Name Servers**：
```bash
aws route53 get-hosted-zone --id $HOSTED_ZONE_ID --query "DelegationSet.NameServers" --output table
```

2. **在您的 DNS 提供商中設定**：
   - 將 `luichu.dev` 的 Name Servers 指向 AWS Route 53 的 Name Servers
   - 或者建立 CNAME 記錄指向 CloudFront 分發

### 步驟 6: 部署基礎設施

```bash
terraform plan
terraform apply
```

### 步驟 7: 驗證設定

部署完成後，驗證網域設定：

```bash
# 檢查 CloudFront 分發
terraform output web_cloudfront_domain

# 檢查完整網域
terraform output web_domain

# 測試 DNS 解析
nslookup chainy.luichu.dev
```

## 🔧 替代方案：使用現有 DNS 提供商

如果您不想使用 Route 53，可以：

### 方案 1: 使用 Cloudflare

1. 在 Cloudflare 中新增 `luichu.dev` 網域
2. 建立 CNAME 記錄：
   - 名稱：`chainy`
   - 內容：`d1234567890.cloudfront.net`（從 terraform output 獲取）
   - 代理狀態：已代理（橘色雲朵）

### 方案 2: 使用其他 DNS 提供商

1. 建立 CNAME 記錄：
   - 主機名稱：`chainy.luichu.dev`
   - 指向：CloudFront 分發網域
2. 等待 DNS 傳播（通常 5-15 分鐘）

## 📋 完整的 terraform.tfvars 範例

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

# 網域配置
web_domain         = "luichu.dev"
web_subdomain      = "chainy"
web_hosted_zone_id = "Z1234567890ABCDEFG" # 替換為實際的 Hosted Zone ID
web_price_class    = "PriceClass_100"

# Optional: Additional tags for all resources
extra_tags = {
  Project     = "chainy"
  Environment = "dev"
  ManagedBy   = "terraform"
}
```

## 🚀 部署後的使用

部署完成後，您的短連結將使用以下格式：

- **API 端點**: `https://chainy.luichu.dev/api/`
- **短連結**: `https://chainy.luichu.dev/abc123`
- **前端介面**: `https://chainy.luichu.dev/`

## 🔍 故障排除

### 常見問題

1. **DNS 解析失敗**
   - 檢查 CNAME 記錄是否正確
   - 等待 DNS 傳播完成
   - 使用 `dig chainy.luichu.dev` 檢查解析

2. **SSL 憑證問題**
   - CloudFront 會自動處理 SSL 憑證
   - 確保網域已驗證

3. **CloudFront 快取問題**
   - 清除 CloudFront 快取
   - 檢查 Origin 設定

### 驗證指令

```bash
# 檢查 DNS 解析
dig chainy.luichu.dev

# 檢查 SSL 憑證
openssl s_client -connect chainy.luichu.dev:443 -servername chainy.luichu.dev

# 測試 API 端點
curl -I https://chainy.luichu.dev/api/health
```

## 📞 需要協助？

如果您需要協助設定 DNS 或遇到任何問題，請提供：
1. 您目前使用的 DNS 提供商
2. `luichu.dev` 的 DNS 設定
3. 任何錯誤訊息
