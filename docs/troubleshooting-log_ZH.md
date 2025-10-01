# Chainy 故障排除日誌

## 日期：2025 年 10 月 1 日

本文檔記錄 Chainy 部署過程中遇到的問題及其解決方案。

---

## 問題 #1：前端無法訪問 - 返回 JSON 錯誤而非 HTML

### 問題描述

訪問 `https://chainy.luichu.dev/` 或任何短網址（如 `https://chainy.luichu.dev/RMKe0Vd`）時，用戶收到 JSON 錯誤訊息而非前端網頁介面：

```json
{ "message": "Short link not found" }
```

### 根本原因

CloudFront 的預設緩存行為被配置為將所有請求（包括根路徑 `/`）路由到 API Gateway。前端檔案存在於 S3 bucket 中，但無法訪問，因為：

1. 所有路徑都被發送到 API Gateway Lambda
2. Lambda 對不存在的短代碼返回 JSON 錯誤
3. 沒有路由規則從 S3 提供 HTML 檔案

### 解決方案

#### 1. 更新 CloudFront 路由配置

檔案：`chainy/modules/web/main.tf`

添加有序緩存行為以將靜態檔案路由到 S3：

```hcl
# 將 HTML 檔案路由到 S3
ordered_cache_behavior {
  path_pattern     = "*.html"
  target_origin_id = "s3-web-origin"
  # ... (緩存設定)
}

# 將 SVG 檔案路由到 S3
ordered_cache_behavior {
  path_pattern     = "*.svg"
  target_origin_id = "s3-web-origin"
  # ... (緩存設定)
}
```

#### 2. 增強 Redirect Lambda 以提供瀏覽器友好響應

檔案：`chainy/handlers/redirect.ts`

**根路徑處理：**

```typescript
// 處理根路徑 - 重定向到前端
if (!code || code === "" || code === "/") {
  const webDomain = process.env.WEB_DOMAIN;
  const webSubdomain = process.env.WEB_SUBDOMAIN || "chainy";
  const fullDomain = webDomain ? `https://${webSubdomain}.${webDomain}` : "";

  if (fullDomain) {
    return {
      statusCode: 302,
      headers: {
        Location: `${fullDomain}/index.html`,
        "Cache-Control": "no-store",
      },
      body: "",
    };
  }
}
```

**瀏覽器友好的 404 頁面：**

```typescript
if (!Item) {
  const acceptHeader = event.headers?.accept || event.headers?.Accept || "";
  const isFromBrowser = acceptHeader.includes("text/html");

  if (isFromBrowser) {
    // 返回美觀的 HTML 404 頁面
    return {
      statusCode: 404,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-store",
      },
      body: `<!DOCTYPE html>...`, // 美觀的 404 頁面
    };
  }

  // 對 API 請求返回 JSON
  return jsonResponse(404, { message: "Short link not found" });
}
```

#### 3. 部署步驟

```bash
# 重新建構 Lambda 函數
cd chainy
npm run package

# 應用 Terraform 更改
terraform apply -auto-approve

# 使 CloudFront 緩存失效
aws cloudfront create-invalidation --distribution-id E3NPZS3FX3FUIT --paths "/*"
```

### 結果

✅ 根路徑現在從 S3 提供前端介面
✅ 短網址正確重定向
✅ 不存在的連結為瀏覽器顯示美觀的 404 頁面
✅ API 請求仍然接收 JSON 響應

---

## 問題 #2：HTTP API 不支持 API Key 驗證

### 問題描述

Terraform 部署失敗，錯誤訊息：

```
Error: ApiKeyRequired is not currently supported for HTTP APIs
Error: Usage plans are not allowed for HTTP Apis
```

### 根本原因

AWS API Gateway v2（HTTP API）不支持 API Key 驗證，只有 REST API 支持。配置嘗試添加：

- 路由上的 `api_key_required = true`
- API Gateway Usage Plans
- API Keys

### 解決方案

#### 1. 移除不支持的資源

檔案：`chainy/modules/api/main.tf`

移除：

```hcl
# 已移除：路由上的 api_key_required
# 已移除：aws_api_gateway_api_key 資源
# 已移除：aws_api_gateway_usage_plan 資源
# 已移除：aws_api_gateway_usage_plan_key 資源
```

#### 2. 更新輸出

檔案：`chainy/modules/api/outputs.tf`

移除 API key 輸出：

```hcl
# 已移除：api_key_id 輸出
# 已移除：api_key_value 輸出
```

檔案：`chainy/outputs.tf`

```hcl
# 已移除：api_key_id 輸出
```

### 未來的替代方案

對於生產環境驗證，考慮：

- AWS Lambda Authorizer（自定義授權邏輯）
- Amazon Cognito User Pools
- Lambda 中的 JWT 驗證
- AWS IAM 驗證
- 如果 API Key 必不可少，遷移到 REST API

### 結果

✅ Terraform 部署成功
✅ API Gateway 正確配置，無不支持的功能

---

## 問題 #3：ESLint 錯誤 - 未使用的函數

### 問題描述

CI/CD 管道因 ESLint 錯誤失敗：

```
/home/runner/work/chainy-web/chainy-web/src/App.jsx
Error: 100:9 error 'toggleLanguage' is assigned a value but never used
```

### 根本原因

函數 `toggleLanguage` 被定義但從未調用。語言切換按鈕直接使用 `setLanguage('zh')` 和 `setLanguage('en')`。

### 解決方案

檔案：`chainy-web/src/App.jsx`

移除未使用的函數：

```javascript
// 已移除：
const toggleLanguage = () => {
  setLanguage((prev) => (prev === "zh" ? "en" : "zh"));
};
```

語言按鈕已經直接使用狀態更新：

```javascript
<button onClick={() => setLanguage('zh')}>中文</button>
<button onClick={() => setLanguage('en')}>EN</button>
```

### 結果

✅ ESLint 檢查通過
✅ CI/CD 管道成功

---

## 問題 #4：為加密貨幣社群更新品牌

### 增強描述

更新標語以更好地與加密貨幣愛好者產生共鳴。

### 變更

檔案：`chainy-web/src/App.jsx`

**之前：**

```javascript
zh: {
  slogan: '極速生成，即刻分享',
},
en: {
  slogan: 'Generate Fast, Share Instantly',
}
```

**之後：**

```javascript
zh: {
  slogan: '秒縮網址，WAGMI 🚀',
},
en: {
  slogan: 'Instant Links, WAGMI 🚀',
}
```

### 理由

- "WAGMI"（We're All Gonna Make It）- 流行的加密貨幣社群梗
- 🚀 火箭表情符號 - "To the Moon" 引用
- 強調速度 - 對加密貨幣交易者很重要
- 創建社群連接

### 部署

```bash
cd chainy-web
npm run build
aws s3 sync dist/ s3://chainy-dev-web/ --delete
aws cloudfront create-invalidation --distribution-id E3NPZS3FX3FUIT --paths "/*"
```

### 結果

✅ 為目標受眾更新品牌
✅ 維護雙語支持

---

## 架構概覽

### 當前設置

```
用戶請求
    ↓
CloudFront (CDN)
    ├─→ S3 源（用於 *.html、*.svg、/assets/*、/static/*）
    │   └─→ 前端 React 應用
    └─→ API Gateway 源（預設 - 用於短代碼）
        └─→ Lambda 函數
            ├─→ redirect.ts (GET /{code})
            └─→ create.ts (POST/PUT/DELETE /links)
```

### 修改的關鍵檔案

1. `chainy/modules/web/main.tf` - CloudFront 路由配置
2. `chainy/handlers/redirect.ts` - Lambda 重定向邏輯與 HTML 回退
3. `chainy/modules/api/main.tf` - API Gateway 配置（移除 API Key）
4. `chainy-web/src/App.jsx` - 前端 UI 和品牌

---

## 學到的最佳實踐

### 1. CloudFront 源路由

- 對靜態內容使用帶特定路徑模式的 `ordered_cache_behavior`
- 預設行為應處理動態內容（短代碼）
- 對檔案類型使用通配符模式（`*.html`、`*.svg`）
- 對目錄使用路徑模式（`/assets/*`、`/static/*`）

### 2. Lambda 響應類型

- 檢查 `Accept` 標頭以確定響應格式
- 對瀏覽器請求返回 HTML
- 對 API 客戶端返回 JSON
- 顯著改善用戶體驗

### 3. HTTP API vs REST API

- HTTP API 更便宜、更快
- HTTP API 不支持 API Key 或 Usage Plans
- 對 HTTP API 驗證使用 Lambda Authorizers
- 如果需要 API Key，考慮 REST API

### 4. CloudFront 緩存失效

- 基礎設施更改後始終使緩存失效
- 使用 `/*` 進行全面失效
- 預計 2-3 分鐘的更改傳播時間

### 5. 靜態網站部署

- 同步到 S3：`aws s3 sync dist/ s3://bucket/ --delete`
- 使 CloudFront 失效：`aws cloudfront create-invalidation --distribution-id X --paths "/*"`
- 驗證 S3 內容：`aws s3 ls s3://bucket/ --recursive`

---

## 命令參考

### Lambda 建構

```bash
cd chainy
npm run package
```

### 基礎設施部署

```bash
cd chainy
terraform apply -auto-approve
```

### 前端部署

```bash
cd chainy-web
npm run build
aws s3 sync dist/ s3://chainy-dev-web/ --delete
aws cloudfront create-invalidation --distribution-id E3NPZS3FX3FUIT --paths "/*"
```

### 驗證

```bash
# 檢查 S3 內容
aws s3 ls s3://chainy-dev-web/ --recursive

# 檢查 CloudFront 失效狀態
aws cloudfront get-invalidation --distribution-id E3NPZS3FX3FUIT --id INVALIDATION_ID

# 測試端點
curl -I https://chainy.luichu.dev/
```

---

## 環境資訊

- **AWS 區域**：ap-northeast-1
- **域名**：chainy.luichu.dev
- **CloudFront Distribution ID**：E3NPZS3FX3FUIT
- **S3 Web Bucket**：chainy-dev-web
- **API Gateway 端點**：https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com
- **DynamoDB 表**：chainy-dev-chainy-links
- **事件 Bucket**：chainy-dev-chainy-events

---

## 未來改進

### 安全性

- [ ] 實施 Lambda Authorizer 進行 API 驗證
- [ ] 在 Lambda 層級添加速率限制
- [ ] 實施 CAPTCHA 進行連結創建
- [ ] 添加機器人保護

### 性能

- [ ] 優化 Lambda 冷啟動時間
- [ ] 為 DynamoDB 實施連接池
- [ ] 為頻繁訪問的連結添加緩存層

### 功能

- [ ] 自定義短代碼生成
- [ ] 連結過期設置
- [ ] 點擊分析儀表板
- [ ] QR 碼生成
- [ ] 重定向前的連結預覽

### 監控

- [ ] 設置 CloudWatch 警報
- [ ] 添加 X-Ray 追蹤
- [ ] 實施詳細日誌記錄
- [ ] 創建運營儀表板

---

**文檔版本**：1.0  
**最後更新**：2025 年 10 月 1 日  
**維護者**：開發團隊
