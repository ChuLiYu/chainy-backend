# ☁️ CloudFlare 免費方案設置指南

## 📋 目錄

1. [為什麼選擇 CloudFlare](#為什麼選擇-cloudflare)
2. [註冊和設置](#註冊和設置)
3. [DNS 配置](#dns-配置)
4. [安全規則配置](#安全規則配置)
5. [監控和分析](#監控和分析)
6. [故障排除](#故障排除)

---

## 🎯 為什麼選擇 CloudFlare

### 免費方案提供的功能

```
用戶 → CloudFlare (免費!) → API Gateway → Lambda
        ↓
    ✅ DDoS 防護
    ✅ 基本 WAF
    ✅ SSL/TLS
    ✅ CDN 加速
    ✅ 速率限制
    ✅ 攻擊分析
```

### 與 AWS WAF 對比

| 功能 | AWS WAF | CloudFlare 免費 |
|------|---------|----------------|
| **月費用** | $10 | $0 |
| **DDoS 防護** | ✅ | ✅ 無限制 |
| **速率限制** | ✅ | ✅ 基本 |
| **SQL 注入防護** | ✅ | ✅ |
| **XSS 防護** | ✅ | ✅ |
| **地理封鎖** | ✅ | ❌ (付費) |
| **自訂規則** | ✅ 完全 | ⚠️ 有限 |
| **CDN** | ❌ | ✅ |
| **SSL 證書** | ❌ (需 ACM) | ✅ 自動 |

**結論：** 對於個人專案，CloudFlare 免費方案提供 80% 的 WAF 功能，且完全免費！

---

## 🚀 註冊和設置（5 分鐘）

### 步驟 1：註冊 CloudFlare

1. **前往 CloudFlare**
   ```
   https://cloudflare.com
   ```

2. **點擊 "Sign Up"**
   - 輸入郵箱
   - 設置密碼
   - 驗證郵箱

3. **選擇免費方案**
   ```
   Free Plan: $0/month
   ✅ 無限 DDoS 防護
   ✅ 基本 WAF 規則
   ✅ SSL 證書
   ```

### 步驟 2：添加網站

1. **點擊 "Add a Site"**

2. **輸入您的域名**
   ```
   yourdomain.com
   ```

3. **選擇 Free Plan**
   - 點擊 "Continue"

4. **CloudFlare 掃描 DNS 記錄**
   - 等待 1-2 分鐘
   - CloudFlare 會自動導入現有 DNS 記錄

5. **查看並確認 DNS 記錄**
   - 檢查記錄是否正確
   - 點擊 "Continue"

### 步驟 3：更新 Name Servers

CloudFlare 會給您兩個 Name Server：

```
ns1.cloudflare.com
ns2.cloudflare.com
```

**在您的域名註冊商處更新 NS 記錄：**

#### GoDaddy 範例
```
1. 登入 GoDaddy
2. 找到您的域名
3. DNS Management → Nameservers
4. 選擇 "Custom"
5. 輸入 CloudFlare 的 NS
6. 保存
```

#### Namecheap 範例
```
1. 登入 Namecheap
2. Domain List → Manage
3. Nameservers → Custom DNS
4. 輸入 CloudFlare 的 NS
5. 保存
```

**⏰ 等待時間：** 2-24 小時（通常 2-4 小時）

---

## 🔧 DNS 配置

### 設置 API 子域名

部署 Chainy 後，您會得到 API Gateway URL：
```
https://abc123.execute-api.ap-northeast-1.amazonaws.com
```

**在 CloudFlare 中添加 CNAME 記錄：**

1. **進入 DNS 頁面**
   ```
   Dashboard → Your Domain → DNS
   ```

2. **添加 CNAME 記錄**
   ```
   Type: CNAME
   Name: api
   Target: abc123.execute-api.ap-northeast-1.amazonaws.com
   Proxy status: ✅ Proxied (橙色雲朵)
   TTL: Auto
   ```

3. **點擊 "Save"**

**重要：** 確保 "Proxy status" 是 **Proxied**（橙色雲朵），這樣流量才會經過 CloudFlare！

### 設置 Web 子域名（可選）

如果您有 Web 前端：

```
Type: CNAME
Name: chainy
Target: your-cloudfront-distribution.cloudfront.net
Proxy status: ✅ Proxied
```

### 驗證 DNS 配置

```bash
# 檢查 DNS 是否生效
nslookup api.yourdomain.com

# 應該看到 CloudFlare 的 IP
# 104.xxx.xxx.xxx 或 172.xxx.xxx.xxx
```

---

## 🛡️ 安全規則配置

### 1. 啟用基本 WAF 規則

1. **進入 Security → WAF**
   ```
   Dashboard → Your Domain → Security → WAF
   ```

2. **啟用託管規則集**
   ```
   ✅ CloudFlare Managed Ruleset
   ✅ CloudFlare OWASP Core Ruleset
   ```

3. **設置模式**
   ```
   Mode: Managed Challenge (推薦)
   或
   Mode: Block (更嚴格)
   ```

### 2. 配置速率限制（免費方案有限）

免費方案無法使用進階速率限制，但可以使用基本保護：

1. **Security → Bots**
   ```
   ✅ Bot Fight Mode (免費)
   - 自動挑戰可疑機器人
   - 減少自動化攻擊
   ```

### 3. 配置 Page Rules（免費 3 條）

1. **Rules → Page Rules**

2. **規則 1：API 安全設置**
   ```
   URL: api.yourdomain.com/*
   
   Settings:
   - Security Level: High
   - Browser Integrity Check: On
   - Cache Level: Bypass (API 不應該被快取)
   ```

3. **規則 2：速率限制（模擬）**
   ```
   URL: api.yourdomain.com/links*
   
   Settings:
   - Security Level: I'm Under Attack (遇到攻擊時啟用)
   ```

### 4. Firewall Rules（免費 5 條）

**規則 1：封鎖已知惡意 IP**

```
Field: Threat Score
Operator: Greater than
Value: 50
Action: Block
```

**規則 2：封鎖可疑 User-Agent**

```
Field: User Agent
Operator: Contains
Value: bot, crawler, scraper
Action: Managed Challenge
```

**規則 3：允許合法流量**

```
Field: Country
Operator: equals
Value: TW, US, JP (您的主要用戶國家)
Action: Allow
```

**規則 4：封鎖高風險國家（可選）**

```
Field: Country
Operator: equals
Value: CN, RU, KP (根據需求調整)
Action: Block
```

### 5. SSL/TLS 設置

1. **SSL/TLS → Overview**
   ```
   Encryption mode: Full (strict)
   ```

2. **SSL/TLS → Edge Certificates**
   ```
   ✅ Always Use HTTPS
   ✅ HTTP Strict Transport Security (HSTS)
   ✅ Minimum TLS Version: TLS 1.2
   ✅ Automatic HTTPS Rewrites
   ```

---

## 📊 監控和分析

### 1. 安全分析

**Security → Analytics**

可以看到：
- 被封鎖的請求數量
- 威脅類型分佈
- 攻擊來源國家
- 時間趨勢

### 2. 流量分析

**Analytics → Traffic**

可以看到：
- 總請求數
- 快取命中率
- 帶寬使用
- 狀態碼分佈

### 3. 設置郵件警報（付費功能）

免費方案無法設置郵件警報，但可以：

1. **定期查看儀表板**
   - 每週檢查一次
   - 關注異常流量

2. **使用 CloudFlare API（進階）**
   ```bash
   # 獲取統計數據
   curl -X GET "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/analytics/dashboard" \
     -H "Authorization: Bearer YOUR_API_TOKEN"
   ```

---

## 🔄 Terraform 整合（可選）

如果想用 Terraform 管理 CloudFlare：

### 1. 安裝 CloudFlare Provider

```hcl
# providers.tf
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
```

### 2. 創建 API Token

1. **CloudFlare Dashboard → My Profile → API Tokens**
2. **Create Token → Edit zone DNS**
3. **複製 Token**

### 3. 配置 DNS 記錄

```hcl
# cloudflare.tf

# 獲取 Zone ID
data "cloudflare_zones" "domain" {
  filter {
    name = var.domain
  }
}

# API 子域名
resource "cloudflare_record" "api" {
  zone_id = data.cloudflare_zones.domain.zones[0].id
  name    = "api"
  value   = trimprefix(module.api.api_endpoint, "https://")
  type    = "CNAME"
  proxied = true  # 啟用 CloudFlare 代理
  ttl     = 1     # Auto
}

# Firewall 規則
resource "cloudflare_firewall_rule" "block_bots" {
  zone_id     = data.cloudflare_zones.domain.zones[0].id
  description = "Block known bots"
  filter_id   = cloudflare_filter.bots.id
  action      = "block"
}

resource "cloudflare_filter" "bots" {
  zone_id     = data.cloudflare_zones.domain.zones[0].id
  description = "Bot filter"
  expression  = "(cf.threat_score gt 50)"
}

# Page Rule
resource "cloudflare_page_rule" "api_security" {
  zone_id = data.cloudflare_zones.domain.zones[0].id
  target  = "api.${var.domain}/*"
  
  actions {
    security_level = "high"
    cache_level    = "bypass"
    browser_check  = "on"
  }
  
  priority = 1
}
```

---

## 🧪 測試和驗證

### 1. 測試 DNS 解析

```bash
# 檢查 DNS
nslookup api.yourdomain.com

# 應該返回 CloudFlare IP
# 104.xxx.xxx.xxx
```

### 2. 測試 SSL

```bash
# 測試 HTTPS
curl -I https://api.yourdomain.com

# 應該看到：
# HTTP/2 200
# server: cloudflare
```

### 3. 測試 WAF

```bash
# 測試 SQL 注入攻擊（應該被封鎖）
curl "https://api.yourdomain.com/links?code=test' OR '1'='1"

# 應該返回：
# 403 Forbidden 或 Managed Challenge 頁面
```

### 4. 測試速率限制

```bash
# 快速發送多個請求
for i in {1..100}; do
  curl https://api.yourdomain.com/
done

# 如果觸發保護，會看到 Managed Challenge
```

---

## ❗ 故障排除

### 問題 1：DNS 未生效

**症狀：** 訪問 api.yourdomain.com 失敗

**解決方案：**
```bash
# 1. 檢查 NS 是否更新
nslookup -type=ns yourdomain.com

# 應該看到 CloudFlare 的 NS

# 2. 等待 DNS 傳播（最多 24 小時）

# 3. 清除本地 DNS 快取
# macOS:
sudo dscacheutil -flushcache

# Windows:
ipconfig /flushdns
```

### 問題 2：橙色雲朵變灰色

**症狀：** CNAME 記錄的代理被禁用

**原因：** 免費方案對某些記錄類型有限制

**解決方案：**
1. 確保使用 CNAME（而非 A 記錄）
2. 目標是完整域名（非 IP）
3. 檢查是否在企業級限制內

### 問題 3：證書錯誤

**症狀：** SSL 證書警告

**解決方案：**
```
1. SSL/TLS → Overview
2. 設置為 "Full (strict)"
3. 等待 5-10 分鐘
4. 清除瀏覽器快取
```

### 問題 4：API 無法訪問

**症狀：** 502 Bad Gateway

**解決方案：**
```
1. 檢查 API Gateway 是否正常運行
2. 確認 CNAME 目標正確
3. 檢查 CloudFlare 快取設置（API 應該 Bypass）
4. 查看 CloudFlare Analytics 是否有錯誤
```

---

## 💡 最佳實踐

### 1. 安全設置

```
✅ 啟用 "Always Use HTTPS"
✅ 啟用 "HSTS"
✅ 設置 Security Level 為 "High"
✅ 啟用 "Bot Fight Mode"
✅ 啟用所有託管規則集
```

### 2. 性能優化

```
✅ API 路由設為 "Bypass Cache"
✅ 靜態資源啟用快取
✅ 啟用 "Auto Minify" (HTML/CSS/JS)
✅ 啟用 "Brotli" 壓縮
```

### 3. 監控

```
✅ 每週檢查 Security Analytics
✅ 關注異常流量模式
✅ 定期審查 Firewall Events
```

---

## 📊 成本對比

### CloudFlare vs AWS WAF

| 項目 | CloudFlare 免費 | AWS WAF |
|------|----------------|---------|
| **設置時間** | 5 分鐘 | 30 分鐘 |
| **月費用** | $0 | $10 |
| **年費用** | $0 | $120 |
| **DDoS 防護** | 無限制 | 有限制 |
| **規則數量** | 5 條（免費） | 無限制 |
| **CDN** | ✅ | ❌ |
| **SSL 證書** | ✅ 自動 | ❌ 需 ACM |
| **維護成本** | 低 | 中等 |

**節省：** $120/年 = 每月一杯星巴克！

---

## 🎓 進階功能（付費方案）

如果將來需要更多功能，可以升級到 Pro ($20/月)：

- ✅ 更多 Firewall 規則（20 條）
- ✅ 更多 Page Rules（20 條）
- ✅ 進階速率限制
- ✅ 圖片優化
- ✅ 移動優化
- ✅ 郵件警報
- ✅ 更詳細的分析

---

## 📚 相關資源

- [CloudFlare 官方文檔](https://developers.cloudflare.com/)
- [CloudFlare Community](https://community.cloudflare.com/)
- [Chainy 成本控制指南](./cost-control-alternatives_ZH.md)
- [Chainy 安全實施總結](./SECURITY_IMPLEMENTATION_SUMMARY_ZH.md)

---

## ✅ 檢查清單

設置完成後，確認以下項目：

- [ ] CloudFlare 帳號已創建
- [ ] 域名已添加到 CloudFlare
- [ ] Name Servers 已更新（等待生效）
- [ ] DNS CNAME 記錄已創建（Proxied）
- [ ] SSL/TLS 設置為 Full (strict)
- [ ] WAF 規則已啟用
- [ ] Page Rules 已配置
- [ ] Bot Fight Mode 已啟用
- [ ] 測試 HTTPS 訪問成功
- [ ] 測試 WAF 規則生效

---

**設置完成！** 🎉

您現在擁有：
- ✅ 免費的 DDoS 防護
- ✅ 基本 WAF 保護
- ✅ 自動 SSL 證書
- ✅ CDN 加速

**月費用：** $0  
**節省：** $120/年

需要幫助？查看 [故障排除](#故障排除) 或 [CloudFlare 社群](https://community.cloudflare.com/)

