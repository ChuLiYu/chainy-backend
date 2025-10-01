# 💰 極致省錢方案實施指南

> **目標：** 月費用 < $1（vs 完整方案 $10-15）  
> **節省：** 90%+ 成本削減  
> **適用：** 個人專案、MVP、低流量應用

---

## 🎯 方案概覽

此方案結合多種免費和低成本服務，在保持基本安全性的同時，將成本降至最低：

```
CloudFlare 免費版 ($0)
    ↓
API Gateway ($0.20)
    ↓
Lambda Authorizer ($0.10)
    ↓
Lambda 函數 ($0.50)
    ↓
DynamoDB ($0.20)
    ↓
CloudWatch (1天, $0.30)
```

**總計：< $1/月** 🎉

---

## 📋 快速開始（10 分鐘）

### 步驟 1：複製配置文件

```bash
# 複製極致省錢配置
cp terraform.tfvars.cost-optimized terraform.tfvars
```

### 步驟 2：編輯配置

```bash
# 使用您喜歡的編輯器
vi terraform.tfvars
# 或
code terraform.tfvars
```

**必須修改：**
```hcl
# ⚠️ 替換為您的郵箱
budget_alert_emails = ["your-email@example.com"]

# ⚠️ 替換為您的名字
extra_tags = {
  Owner = "your-name"
}
```

**可選修改（如果有域名）：**
```hcl
web_domain         = "yourdomain.com"
web_subdomain      = "chainy"
web_hosted_zone_id = "YOUR_ROUTE53_ZONE_ID"
```

### 步驟 3：部署

```bash
# 初始化（如果還沒有）
terraform init

# 查看計劃
terraform plan

# 部署！
terraform apply
```

### 步驟 4：設置 CloudFlare（5 分鐘）

詳細步驟請看：[CloudFlare 設置指南](docs/cloudflare-setup-guide_ZH.md)

**快速步驟：**

1. **註冊 CloudFlare**
   ```
   https://cloudflare.com → Sign Up
   ```

2. **添加域名**
   ```
   Add Site → 輸入您的域名 → 選擇 Free Plan
   ```

3. **更新 Name Servers**
   ```
   在域名註冊商處更新 NS 記錄
   等待 2-24 小時生效
   ```

4. **配置 DNS**
   ```
   Type: CNAME
   Name: api
   Target: <您的 API Gateway URL>
   Proxy: ✅ Proxied
   ```

5. **啟用安全規則**
   ```
   Security → WAF → 啟用 CloudFlare Managed Rules
   Security → Bots → 啟用 Bot Fight Mode
   ```

### 步驟 5：驗證

```bash
# 1. 確認 DNS
nslookup api.yourdomain.com

# 2. 測試 API
curl https://api.yourdomain.com/

# 3. 檢查預算警報郵件
# 查看郵箱，確認 AWS SNS 訂閱
```

---

## 💡 配置說明

### 為什麼這樣配置？

#### 1. CloudFlare 免費版（省 $120/年）

**替代：** AWS WAF ($10/月)

**提供：**
- ✅ DDoS 防護（無限制）
- ✅ 基本 WAF 規則
- ✅ SQL 注入防護
- ✅ XSS 防護
- ✅ SSL 證書（自動）
- ✅ CDN 加速

**成本：** $0

#### 2. 日誌保留 1 天（省 70%）

**設置：**
```hcl
log_retention_in_days = 1
```

**原因：**
- 1 天足夠排查即時問題
- 超過 1 天的問題可以從預算警報得知
- CloudWatch 成本從 $2 降到 $0.30

**成本：** $0.30/月（vs $2/月）

#### 3. 只記錄錯誤（省 90% 日誌量）

**設置：**
```hcl
lambda_additional_environment = {
  LOG_LEVEL = "ERROR"
}
```

**原因：**
- DEBUG/INFO 日誌在生產環境用處不大
- 錯誤日誌是最重要的
- 大幅減少日誌量和成本

**效果：** 日誌量減少 90%

#### 4. AWS Budgets（免費）

**設置：**
```hcl
enable_budget_monitoring = true
monthly_budget_limit     = 10
```

**原因：**
- 前 2 個預算完全免費
- 80% 和 100% 雙重警報
- 避免意外超支

**成本：** $0

#### 5. 不啟用 AWS WAF

**設置：**
```hcl
enable_waf = false
```

**原因：**
- CloudFlare 提供了類似功能
- AWS WAF $10/月對個人專案負擔大
- CloudFlare 免費版足夠

**節省：** $10/月

---

## 📊 成本對比

### 完整方案 vs 極致省錢

| 項目 | 完整方案 | 極致省錢 | 節省 |
|------|---------|---------|------|
| **WAF** | AWS $10 | CloudFlare $0 | $10 |
| **CloudWatch** | 30天 $2 | 1天 $0.30 | $1.70 |
| **Lambda** | $0.50 | $0.50 | $0 |
| **DynamoDB** | $0.20 | $0.20 | $0 |
| **其他** | $0.30 | $0.30 | $0 |
| **總計** | **$13** | **< $1.30** | **$11.70** |
| **年費用** | $156 | $15.60 | **$140** |

**節省比例：** 90%+

---

## 🔍 功能對比

### 安全保護級別

| 功能 | 完整方案 | 極致省錢 |
|------|---------|---------|
| DDoS 防護 | ✅ AWS WAF | ✅ CloudFlare |
| 速率限制 | ✅ 2000/5min | ✅ CF 基本 |
| SQL 注入 | ✅ AWS WAF | ✅ CF WAF |
| XSS 防護 | ✅ AWS WAF | ✅ CF WAF |
| JWT 認證 | ✅ | ✅ |
| 地理封鎖 | ✅ | ⚠️ CF 付費 |
| 自訂規則 | ✅ 無限 | ⚠️ 5 條 |
| **保護級別** | **⭐⭐⭐⭐⭐** | **⭐⭐⭐⭐** |

**結論：** 極致省錢方案提供 80% 的保護，適合個人專案！

---

## 🚀 進階優化

### 如果還想更省錢

#### 1. 使用 API Gateway 內建速率限制

```hcl
# modules/api/main.tf
default_route_settings {
  throttling_burst_limit = 20   # 降低限制
  throttling_rate_limit  = 10   # 更嚴格
}
```

**節省：** 減少無效請求，降低 Lambda 成本

#### 2. Lambda 層速率限制

在 Lambda 中實作簡單的速率檢查：

```typescript
const requestCounts = new Map();

export async function handler(event) {
  const ip = event.requestContext.http.sourceIp;
  const count = requestCounts.get(ip) || 0;
  
  if (count > 100) {
    return { statusCode: 429, body: "Too many requests" };
  }
  
  requestCounts.set(ip, count + 1);
  // ... 正常處理
}
```

#### 3. 使用保留併發（避免冷啟動）

對於關鍵函數：

```hcl
# 只為關鍵函數保留 1 個併發
resource "aws_lambda_provisioned_concurrency_config" "critical" {
  function_name                     = aws_lambda_function.create.function_name
  provisioned_concurrent_executions = 1
  qualifier                         = aws_lambda_function.create.version
}
```

**成本：** ~$5/月  
**好處：** 消除冷啟動，提升用戶體驗

---

## 🔄 升級路徑

### 何時應該升級？

#### 升級觸發條件：

1. **流量增長** 
   ```
   > 10,000 請求/天 → 考慮 CloudFlare Pro ($20)
   > 100,000 請求/天 → 考慮 AWS WAF
   ```

2. **安全要求提升**
   ```
   處理敏感資料 → 啟用 AWS WAF
   需要合規 → 完整方案
   ```

3. **預算增加**
   ```
   有付費用戶 → 投資安全值得
   融資/盈利 → 升級到完整方案
   ```

### 升級步驟：

**階段 1：啟用 AWS WAF**
```hcl
enable_waf = true
```
**增加成本：** +$10/月

**階段 2：增加日誌保留**
```hcl
log_retention_in_days = 7
```
**增加成本：** +$0.50/月

**階段 3：完整監控**
```hcl
log_retention_in_days = 30
lambda_additional_environment = {
  LOG_LEVEL = "INFO"
}
```
**增加成本：** +$1.50/月

---

## 📈 監控成本

### 每日檢查（自動化）

```bash
# 創建每日成本檢查腳本
cat > check-cost.sh << 'EOF'
#!/bin/bash
COST=$(aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics UnblendedCost \
  --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
  --output text)

echo "Today's cost: \$$COST"

if (( $(echo "$COST > 1" | bc -l) )); then
  echo "⚠️ Cost exceeded $1!"
  # 發送通知
fi
EOF

chmod +x check-cost.sh

# 設置 cron（每天早上 9 點）
echo "0 9 * * * /path/to/check-cost.sh" | crontab -
```

### CloudFlare 監控

```
Dashboard → Analytics → Security
- 查看被封鎖的請求
- 識別攻擊模式
- 優化規則
```

---

## ✅ 檢查清單

部署前確認：

- [ ] 已複製 `terraform.tfvars.cost-optimized` 為 `terraform.tfvars`
- [ ] 已替換郵箱地址
- [ ] 已替換 Owner 標籤
- [ ] (可選) 已配置域名
- [ ] 已執行 `terraform init`
- [ ] 已執行 `terraform plan` 並審查
- [ ] 已註冊 CloudFlare 帳號
- [ ] 準備好域名（如果使用）

部署後驗證：

- [ ] terraform apply 成功
- [ ] 收到 SNS 訂閱確認郵件
- [ ] CloudFlare DNS 生效
- [ ] API 可以訪問
- [ ] CloudFlare WAF 規則生效
- [ ] 預算警報已設置
- [ ] 成本監控正常

---

## 🆘 故障排除

### 問題 1：成本超過預期

**檢查：**
```bash
# 查看詳細成本
aws ce get-cost-and-usage \
  --time-period Start=2025-10-01,End=2025-10-31 \
  --granularity DAILY \
  --metrics UnblendedCost \
  --group-by Type=SERVICE
```

**常見原因：**
- Lambda 調用次數過多 → 檢查是否有循環調用
- DynamoDB 讀寫超額 → 優化查詢
- CloudWatch 日誌量大 → 檢查 LOG_LEVEL 設置

### 問題 2：CloudFlare 未生效

**檢查：**
```bash
# 1. 確認 DNS
nslookup api.yourdomain.com

# 2. 檢查代理狀態
# 應該返回 CloudFlare IP（104.x.x.x）

# 3. 測試 WAF
curl -I https://api.yourdomain.com
# 應該看到 server: cloudflare
```

### 問題 3：預算警報未收到

**檢查：**
```bash
# 1. 確認 SNS 訂閱
aws sns list-subscriptions

# 2. 檢查郵箱垃圾郵件
# 3. 重新訂閱
```

---

## 📚 相關文檔

- [CloudFlare 設置指南](docs/cloudflare-setup-guide_ZH.md)
- [成本控制替代方案](docs/cost-control-alternatives_ZH.md)
- [WAF 成本效益分析](docs/waf-cost-benefit-analysis_ZH.md)
- [安全實施總結](docs/SECURITY_IMPLEMENTATION_SUMMARY_ZH.md)

---

## 🎉 恭喜！

您現在擁有：

✅ **企業級安全保護**
- CloudFlare DDoS 防護
- 基本 WAF 規則
- JWT 認證

✅ **完整成本控制**
- 預算監控和警報
- 最優化配置
- 月費用 < $1

✅ **靈活升級路徑**
- 隨時可以升級
- 平滑過渡
- 無需重新部署

**月費用：< $1** 🎉  
**vs 完整方案：$10-15**  
**節省：90%+**

需要幫助？查看 [故障排除](#故障排除) 或提交 Issue！

