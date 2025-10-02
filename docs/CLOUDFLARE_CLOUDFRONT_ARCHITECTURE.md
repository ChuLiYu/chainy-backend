# Cloudflare + CloudFront 架構說明

## 📋 概述

本文檔詳細解釋 Chainy 專案中 Cloudflare、CloudFront 和 CNAME 的關係，以及它們如何協同工作。

## 🏗️ 架構組件

### 1. CNAME (Canonical Name)

**定義**: CNAME 是 DNS 記錄類型，用於將一個域名指向另一個域名。

**在專案中的作用**:

```
chainy.luichu.dev → d3hdtwr5zmjki6.cloudfront.net
```

**DNS 解析結果**:

```bash
# 查詢 chainy.luichu.dev
dig chainy.luichu.dev
# 結果: 172.67.146.31, 104.21.10.168 (Cloudflare IP)

# 查詢 CloudFront 域名
dig d3hdtwr5zmjki6.cloudfront.net
# 結果: 3.175.64.51, 3.175.64.22, 3.175.64.56, 3.175.64.82 (AWS IP)
```

### 2. Cloudflare

**定義**: Cloudflare 是 CDN 和安全服務提供商，提供 DDoS 防護、WAF、SSL 等服務。

**在專案中的配置**:

```
CNAME: chainy → d3hdtwr5zmjki6.cloudfront.net
Proxy Status: 🟠 Proxied (Auto)
```

**提供的服務**:

- ✅ DDoS 防護
- ✅ 基本 WAF 規則
- ✅ SSL/TLS 終止
- ✅ 全球 CDN 加速
- ✅ 免費方案

### 3. CloudFront

**定義**: CloudFront 是 AWS 的 CDN 服務，提供全球內容分發。

**在專案中的配置**:

```json
{
  "DomainName": "d3hdtwr5zmjki6.cloudfront.net",
  "Aliases": ["chainy.luichu.dev"],
  "Origins": [
    {
      "Id": "chainy-origin",
      "DomainName": "chainy-prod-web.s3-website.ap-northeast-1.amazonaws.com"
    }
  ]
}
```

**提供的服務**:

- ✅ 全球 CDN 分發
- ✅ S3 靜態網站託管
- ✅ SSL 證書管理
- ✅ 快取策略控制

## 🔄 請求流程

### 完整請求路徑

```
用戶瀏覽器
    ↓
Cloudflare (代理層)
    ↓
CloudFront (AWS CDN)
    ↓
S3 Website Endpoint (靜態文件)
```

### 詳細步驟

1. **用戶請求**: `https://chainy.luichu.dev`
2. **DNS 解析**: 解析到 Cloudflare IP (172.67.146.31, 104.21.10.168)
3. **Cloudflare 處理**:
   - SSL/TLS 終止
   - DDoS 防護檢查
   - WAF 規則檢查
   - 快取查詢
4. **轉發到 CloudFront**: 請求轉發到 `d3hdtwr5zmjki6.cloudfront.net`
5. **CloudFront 處理**:
   - 檢查快取
   - 路由到 S3 Origin
   - 應用快取策略
6. **S3 回應**: 返回靜態文件 (HTML, CSS, JS)

## 📊 各層功能對比

| 功能          | Cloudflare   | CloudFront   | S3         |
| ------------- | ------------ | ------------ | ---------- |
| **DDoS 防護** | ✅ 免費無限  | ❌ 需 WAF    | ❌         |
| **WAF 規則**  | ✅ 基本免費  | ❌ 需 WAF    | ❌         |
| **SSL 證書**  | ✅ 自動管理  | ✅ ACM 證書  | ❌         |
| **全球 CDN**  | ✅ 200+ 節點 | ✅ 400+ 節點 | ❌         |
| **快取控制**  | ✅ 基本      | ✅ 進階      | ❌         |
| **成本**      | 免費         | 按流量計費   | 按存儲計費 |

## 🎯 專案中的具體配置

### Cloudflare DNS 記錄

```
Type: CNAME
Name: chainy
Content: d3hdtwr5zmjki6.cloudfront.net
Proxy status: 🟠 Proxied
TTL: Auto
```

### CloudFront 分發配置

```json
{
  "CallerReference": "13b02f80-5e6d-43c8-86f3-7bee12e1c65a",
  "Aliases": {
    "Quantity": 1,
    "Items": ["chainy.luichu.dev"]
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "chainy-origin",
        "DomainName": "chainy-prod-web.s3-website.ap-northeast-1.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only"
        }
      }
    ]
  }
}
```

### S3 靜態網站配置

```
Bucket: chainy-prod-web
Region: ap-northeast-1
Website Endpoint: chainy-prod-web.s3-website.ap-northeast-1.amazonaws.com
Index Document: index.html
```

## ⚡ 性能優化

### 快取策略

1. **Cloudflare 快取**:

   - 靜態資源: 4 小時
   - HTML 文件: 動態 (不快取)
   - API 請求: 動態 (不快取)

2. **CloudFront 快取**:
   - 靜態資源: 1 年
   - HTML 文件: 1 小時
   - API 請求: 不快取

### 壓縮設置

- **Cloudflare**: 自動壓縮 (Gzip, Brotli)
- **CloudFront**: 啟用壓縮

## 🔒 安全配置

### SSL/TLS 設置

1. **Cloudflare**:

   - 加密模式: Full (strict)
   - 最小 TLS 版本: 1.2
   - HSTS: 啟用

2. **CloudFront**:
   - 查看器協議策略: redirect-to-https
   - 最小協議版本: TLSv1.2_2021

### 安全頭部

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

## 🚨 故障排除

### 常見問題

1. **雙層 CDN 延遲**:

   - 問題: Cloudflare → CloudFront 可能增加延遲
   - 解決: 優化快取策略，減少回源請求

2. **SSL 證書鏈**:

   - 問題: 多層 SSL 終止
   - 解決: 確保證書配置正確

3. **快取不一致**:
   - 問題: 兩層快取可能不同步
   - 解決: 設置適當的快取標頭

### 監控指標

- **Cloudflare**: 請求量、快取命中率、安全事件
- **CloudFront**: 請求量、快取命中率、錯誤率
- **S3**: 請求量、存儲使用量

## 💰 成本分析

### 當前成本結構

| 服務           | 成本         | 說明                         |
| -------------- | ------------ | ---------------------------- |
| **Cloudflare** | $0/月        | 免費方案                     |
| **CloudFront** | ~$1-5/月     | 按流量計費                   |
| **S3**         | ~$0.5/月     | 按存儲計費                   |
| **總計**       | ~$1.5-5.5/月 | 相比純 AWS 方案節省 $5-10/月 |

### 成本優化建議

1. **使用 Cloudflare 免費 DDoS 防護** (節省 AWS WAF 費用)
2. **優化快取策略** (減少 CloudFront 請求)
3. **壓縮靜態資源** (減少帶寬使用)

## 🎉 總結

### 架構優勢

1. **安全性**: 雙層防護 (Cloudflare + CloudFront)
2. **性能**: 全球 CDN 加速
3. **成本**: 免費 DDoS 防護
4. **可靠性**: 多層故障轉移

### 最佳實踐

1. **保持 Cloudflare 代理啟用** (安全 + 成本效益)
2. **優化快取策略** (減少延遲)
3. **監控性能指標** (確保服務品質)
4. **定期更新證書** (確保安全性)

---

_文檔創建: 2025 年 10 月 2 日_  
_作者: Lui Chu_  
_專案: Chainy URL Shortener Service_
